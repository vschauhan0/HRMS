import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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

export async function GET(
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

    const batch = await db.salaryBatch.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        uploader: { select: { id: true, email: true, adminProfile: { select: { name: true } } } },
        salarySlips: {
          include: {
            employee: {
              include: {
                company: { select: { name: true } },
                branch: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ success: false, message: 'Batch not found' }, { status: 404 });
    }

    // Company access check
    if (user.role === 'ADMIN' && user.adminProfile?.companyId !== batch.companyId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...batch,
        uploaderName: batch.uploader?.adminProfile?.name || batch.uploader?.email || 'Unknown',
      },
    });
  } catch (error: any) {
    console.error('Salary batch detail error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
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

    const batch = await db.salaryBatch.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!batch) {
      return NextResponse.json({ success: false, message: 'Batch not found' }, { status: 404 });
    }

    if (user.role === 'ADMIN' && user.adminProfile?.companyId !== batch.companyId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Delete cascades to salary slips via onDelete: Cascade
    await db.salaryBatch.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Batch deleted successfully' });
  } catch (error: any) {
    console.error('Salary batch delete error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}