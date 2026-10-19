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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await context.params;
    const user = await getAuthUser(request);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = (formData.get('photo') || formData.get('file')) as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'File is required' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'File size must be under 5MB' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'photos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.name) || '.jpg';
    const fileName = `${employeeId}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const photoPath = `uploads/photos/${fileName}`;

    await db.employee.update({
      where: { id: employeeId },
      data: { profilePhoto: photoPath },
    });

    return NextResponse.json({
      success: true,
      data: { profilePhoto: photoPath },
      message: 'Profile photo updated',
    });
  } catch (error: any) {
    console.error('Profile photo upload error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: employeeId } = await params;
    const user = await getAuthUser(request);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await db.employee.update({
      where: { id: employeeId },
      data: { profilePhoto: null },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile photo removed',
    });
  } catch (error: any) {
    console.error('Profile photo remove error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
