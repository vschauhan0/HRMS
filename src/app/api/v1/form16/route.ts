import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const where: any = {};

    if (user.role === 'EMPLOYEE') {
      where.employeeId = user.employee!.id;
    } else if (user.role === 'ADMIN') {
      where.employee = { companyId: user.adminProfile!.companyId };
    }
    // SUPER_ADMIN sees all

    const documents = await db.form16Document.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            company: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: documents });
  } catch (error: any) {
    console.error('Form16 list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const employeeId = formData.get('employeeId') as string;
    const financialYear = formData.get('financialYear') as string;

    if (!file) {
      return NextResponse.json({ success: false, message: 'File is required' }, { status: 400 });
    }
    if (!employeeId || !financialYear) {
      return NextResponse.json({ success: false, message: 'employeeId and financialYear are required' }, { status: 400 });
    }

    // Verify employee exists and is in accessible company
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
    }

    if (user.role === 'ADMIN' && user.adminProfile?.companyId !== employee.companyId) {
      return NextResponse.json({ success: false, message: 'Forbidden: employee not in your company' }, { status: 403 });
    }

    // Ensure upload directory exists
    const uploadDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads', 'form16');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    const fileExtension = path.extname(file.name) || '.pdf';
    const fileName = `form16_${employeeId}_${financialYear}_${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Upsert Form16 document
    const doc = await db.form16Document.upsert({
      where: {
        employeeId_financialYear: {
          employeeId,
          financialYear,
        },
      },
      create: {
        employeeId,
        financialYear,
        filePath: `uploads/form16/${fileName}`,
        uploadedBy: user.id,
      },
      update: {
        filePath: `uploads/form16/${fileName}`,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: doc.id, financialYear: doc.financialYear },
      message: 'Form 16 uploaded successfully',
    });
  } catch (error: any) {
    console.error('Form16 upload error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}