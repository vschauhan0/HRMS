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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const doc = await db.form16Document.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, companyId: true } },
      },
    });

    if (!doc) {
      return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 });
    }

    if (user.role === 'ADMIN' && doc.employee.companyId !== user.adminProfile!.companyId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    let fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), doc.filePath);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', doc.filePath);
    }
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await db.form16Document.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Form 16 deleted successfully' });
  } catch (error: any) {
    console.error('Form16 delete error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
