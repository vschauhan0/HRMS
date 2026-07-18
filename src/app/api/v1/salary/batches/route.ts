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
    const companyId = searchParams.get('companyId');
    const branchId = searchParams.get('branchId');
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');

    const where: any = {};

    // Company access control
    if (user.role === 'ADMIN') {
      where.companyId = user.adminProfile!.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    if (branchId) where.branchId = branchId;
    if (monthStr) {
      const month = parseInt(monthStr, 10);
      if (!isNaN(month)) where.month = month;
    }
    if (yearStr) {
      const year = parseInt(yearStr, 10);
      if (!isNaN(year)) where.year = year;
    }

    const [batches, total] = await Promise.all([
      db.salaryBatch.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true, code: true } },
          uploader: { select: { id: true, email: true, adminProfile: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.salaryBatch.count({ where }),
    ]);

    const formattedBatches = batches.map((b) => ({
      ...b,
      uploaderName: b.uploader?.adminProfile?.name || b.uploader?.email || 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      data: formattedBatches,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    console.error('Salary batches list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}