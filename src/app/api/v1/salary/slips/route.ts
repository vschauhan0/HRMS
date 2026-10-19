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
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');
    const employeeIdParam = searchParams.get('employeeId');

    const where: any = {};

    if (user.role === 'EMPLOYEE') {
      // Employees can only see their own slips
      where.employeeId = user.employee!.id;
    } else if (user.role === 'ADMIN') {
      // Admins see all slips for their company
      where.batch = { companyId: user.adminProfile!.companyId };
    }
    // SUPER_ADMIN sees everything unless filtered

    if (monthStr) {
      const month = parseInt(monthStr, 10);
      if (!isNaN(month)) where.month = month;
    }
    if (yearStr) {
      const year = parseInt(yearStr, 10);
      if (!isNaN(year)) where.year = year;
    }
    if (employeeIdParam && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) {
      where.employeeId = employeeIdParam;
    }

    const [slips, total] = await Promise.all([
      db.salarySlip.findMany({
        where,
        include: {
          employee: {
            include: {
              company: { select: { id: true, name: true, code: true, address: true } },
              branch: { select: { id: true, name: true, code: true } },
              bankDetail: { select: { bankName: true, accountNumber: true } },
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.salarySlip.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        data: slips,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error('Salary slips list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}