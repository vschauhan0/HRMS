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
  const payload = verifyToken(token) as { id: string } | null;
  if (!payload) return null;
  return db.user.findUnique({
    where: { id: (payload as any).id },
    include: { adminProfile: { include: { company: true } }, employee: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role === 'EMPLOYEE') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const branchId = searchParams.get('branchId');

    const where: any = {};
    if (authUser.role === 'ADMIN') {
      where.companyId = authUser.adminProfile!.companyId;
    } else if (authUser.role === 'SUPER_ADMIN' && companyId) {
      where.companyId = companyId;
    }

    if (branchId && branchId !== 'ALL') {
      where.branchId = branchId;
    }

    const [total, active, inactive] = await Promise.all([
      db.employee.count({ where }),
      db.employee.count({ where: { ...where, status: 'ACTIVE' } }),
      db.employee.count({ where: { ...where, status: { not: 'ACTIVE' } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { total, active, inactive }
    });
  } catch (error) {
    console.error('Stats employees error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
