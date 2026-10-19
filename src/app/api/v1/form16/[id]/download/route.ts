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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
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

    // Access control: employee can only download their own, admin only their company
    if (user.role === 'EMPLOYEE') {
      if (doc.employeeId !== user.employee!.id) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }
    } else if (user.role === 'ADMIN') {
      if (doc.employee.companyId !== user.adminProfile!.companyId) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }
    }

    let fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), doc.filePath);
    if (!fs.existsSync(fullPath)) {
      // Fallback to public/ directory where generated files are stored
      fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', doc.filePath);
    }
    
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ success: false, message: 'File not found on disk' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const fileName = path.basename(doc.filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Form16 download error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}