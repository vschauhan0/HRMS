import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, generateApplicationNo } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

function getToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function getAuthUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  const payload = verifyToken(token) as { id: string } | null;
  if (!payload) return null;
  return db.user.findUnique({
    where: { id: (payload as any).id },
    include: { adminProfile: { include: { company: true } }, employee: true },
  });
}

async function saveUploadedFile(file: File, folder: string): Promise<string> {
  const uploadDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads', folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const fileExtension = path.extname(file.name) || '.bin';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExtension}`;
  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return `uploads/${folder}/${fileName}`;
}

// POST - Public (no auth required)
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let photoFile: File | null = null;
    let signatureFile: File | null = null;
    let documentFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = Object.fromEntries(
        Array.from(formData.entries()).filter(([key]) => {
          const val = formData.get(key);
          return !(val instanceof File);
        })
      );
      // Get files
      const photo = formData.get('photo') as File | null;
      const signature = formData.get('signature') as File | null;
      const doc = formData.get('document') as File | null;
      if (photo && photo.size > 0) photoFile = photo;
      if (signature && signature.size > 0) signatureFile = signature;
      if (doc && doc.size > 0) documentFile = doc;
    } else {
      body = await request.json();
    }

    const { companyId, branchId } = body;
    if (!companyId || !branchId) {
      return NextResponse.json(
        { success: false, message: 'Company and branch are required' },
        { status: 400 }
      );
    }

    // Verify company and branch exist
    const branch = await db.branch.findUnique({
      where: { id: branchId },
      include: { company: true },
    });
    if (!branch || branch.companyId !== companyId) {
      return NextResponse.json({ success: false, message: 'Invalid company or branch' }, { status: 400 });
    }

    // Save files
    let photoPath: string | null = null;
    let signaturePath: string | null = null;
    let documentPath: string | null = null;

    if (photoFile) photoPath = await saveUploadedFile(photoFile, 'appointments/photos');
    if (signatureFile) signaturePath = await saveUploadedFile(signatureFile, 'appointments/signatures');
    if (documentFile) documentPath = await saveUploadedFile(documentFile, 'appointments/documents');

    const applicationNo = generateApplicationNo();
    const fullName = [body.firstName, body.middleName, body.surname].filter(Boolean).join(' ');

    const appointment = await db.appointmentForm.create({
      data: {
        applicationNo,
        fullName: fullName || null,
        email: body.email || null,
        mobile: body.mobile || null,
        companyId,
        branchId,
        documentPath,
        employeeCode: body.employeeCode || null,
        joiningDate: body.joiningDate ? new Date(body.joiningDate) : null,
        department: body.department || null,
        designation: body.designation || null,
        managerName: body.managerName || null,
        salary: body.salary ? parseFloat(body.salary) : null,
        whatsappNo: body.whatsappNo || null,
        punchingNo: body.punchingNo || null,
        firstName: body.firstName || null,
        middleName: body.middleName || null,
        surname: body.surname || null,
        address: body.address || null,
        village: body.village || null,
        taluka: body.taluka || null,
        district: body.district || null,
        dob: body.dob ? new Date(body.dob) : null,
        birthPlace: body.birthPlace || null,
        gender: body.gender || null,
        cast: body.cast || null,
        maritalStatus: body.maritalStatus || null,
        bloodGroup: body.bloodGroup || null,
        referenceName: body.referenceName || null,
        referenceMobile: body.referenceMobile || null,
        aadharNumber: body.aadharNumber || null,
        panNumber: body.panNumber || null,
        bankName: body.bankName || null,
        bankIfsc: body.bankIfsc || null,
        bankAccountNo: body.bankAccountNo || null,
        education: body.education || null,
        familyMembers: body.familyMembers || null,
        photoPath,
        signaturePath,
      },
    });

    return NextResponse.json({
      success: true,
      data: { applicationNo: appointment.applicationNo },
      message: 'Application submitted successfully',
    });
  } catch (error: any) {
    console.error('Appointment submit error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Admin only
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
    const status = searchParams.get('status');

    const where: any = {};
    if (user.role === 'ADMIN') {
      where.companyId = user.adminProfile!.companyId;
    }
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    const [appointments, total] = await Promise.all([
      db.appointmentForm.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true, code: true } },
          employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.appointmentForm.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        data: appointments,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error('Appointments list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
