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
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const branchId = searchParams.get('branchId');
    const companyId = searchParams.get('companyId');

    const where: any = {};

    if (user.role === 'ADMIN') {
      where.companyId = user.adminProfile!.companyId;
    } else if (companyId) {
      where.companyId = companyId;
    }

    if (status) where.status = status;
    if (department) where.department = department;
    if (branchId) where.branchId = branchId;

    const [employees, total, statusSummary] = await Promise.all([
      db.employee.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.employee.count({ where }),
      db.employee.groupBy({
        by: ['status'],
        where: user.role === 'ADMIN'
          ? { companyId: user.adminProfile!.companyId }
          : companyId ? { companyId } : {},
        _count: { status: true },
      }),
    ]);

    const summary: Record<string, number> = {};
    for (const s of statusSummary) {
      summary[s.status] = s._count.status;
    }

    return NextResponse.json({
      success: true,
      data: employees,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      summary,
    });
  } catch (error: any) {
    console.error('Employee report error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}