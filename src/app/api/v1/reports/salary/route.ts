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
    const companyId = searchParams.get('companyId');
    const branchId = searchParams.get('branchId');
    const yearStr = searchParams.get('year');

    const batchWhere: any = {};
    if (user.role === 'ADMIN') {
      batchWhere.companyId = user.adminProfile!.companyId;
    } else if (companyId) {
      batchWhere.companyId = companyId;
    }
    if (branchId) batchWhere.branchId = branchId;
    if (yearStr) {
      const year = parseInt(yearStr, 10);
      if (!isNaN(year)) batchWhere.year = year;
    }

    // Get monthly summary using salary slips aggregation
    const salaryData = await db.salarySlip.groupBy({
      by: ['month', 'year'],
      where: {
        batch: batchWhere,
      },
      _sum: {
        grossSalary: true,
        totalDeduction: true,
        netSalary: true,
      },
      _count: {
        id: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const monthlyReport = salaryData.map((item) => ({
      month: item.month,
      year: item.year,
      totalGross: item._sum.grossSalary || 0,
      totalDeductions: item._sum.totalDeduction || 0,
      totalNet: item._sum.netSalary || 0,
      employeeCount: item._count.id,
    }));

    // Overall totals
    const totals = await db.salarySlip.aggregate({
      where: {
        batch: batchWhere,
      },
      _sum: {
        grossSalary: true,
        totalDeduction: true,
        netSalary: true,
      },
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        monthly: monthlyReport,
        totals: {
          totalGross: totals._sum.grossSalary || 0,
          totalDeductions: totals._sum.totalDeduction || 0,
          totalNet: totals._sum.netSalary || 0,
          totalSlips: totals._count.id,
        },
      },
    });
  } catch (error: any) {
    console.error('Salary report error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}