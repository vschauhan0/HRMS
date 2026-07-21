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
  const payload = verifyToken(token);
  if (!payload) return null;
  return db.user.findUnique({
    where: { id: (payload as any).id },
    include: { adminProfile: { include: { company: true } }, employee: true },
  });
}

// POST - Public (no auth required)
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {
        fullName: formData.get('fullName') as string,
        email: formData.get('email') as string,
        mobile: formData.get('mobile') as string,
        companyId: formData.get('companyId') as string,
        branchId: formData.get('branchId') as string,
      };
      file = formData.get('document') as File | null;
    } else {
      body = await request.json();
    }

    const { fullName, email, mobile, companyId, branchId } = body;

    if (!fullName || !email || !mobile || !companyId || !branchId) {
      return NextResponse.json(
        { success: false, message: 'fullName, email, mobile, companyId, and branchId are required' },
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

    let documentPath: string | null = null;

    // Save document if provided
    if (file && file.size > 0) {
      const uploadDir = path.join(process.cwd(), 'uploads', 'appointments');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileExtension = path.extname(file.name) || '.pdf';
      const fileName = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      documentPath = `uploads/appointments/${fileName}`;
    }

    const applicationNo = generateApplicationNo();

    const appointment = await db.appointmentForm.create({
      data: {
        applicationNo,
        fullName,
        email,
        mobile,
        companyId,
        branchId,
        documentPath,
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
      data: appointments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    console.error('Appointments list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}