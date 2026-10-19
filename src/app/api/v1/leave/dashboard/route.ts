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
    const companyId = searchParams.get('companyId') || '';
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {};
    const employeeWhere: any = {};

    if (user.role === 'EMPLOYEE') {
      where.employeeId = user.employeeId || '';
      employeeWhere.id = user.employeeId || '';
    } else if (user.role === 'ADMIN') {
      where.employee = { companyId: user.adminProfile?.companyId || '' };
      employeeWhere.companyId = user.adminProfile?.companyId || '';
    } else if (user.role === 'SUPER_ADMIN' && companyId) {
      where.employee = { companyId };
      employeeWhere.companyId = companyId;
    }

    const pendingRequests = await db.leaveRequest.count({
      where: { ...where, status: 'PENDING' }
    });

    const approvedRequests = await db.leaveRequest.count({
      where: { ...where, status: 'APPROVED' }
    });

    const rejectedRequests = await db.leaveRequest.count({
      where: { ...where, status: 'REJECTED' }
    });

    // Employees on leave today
    const onLeaveToday = await db.leaveRequest.count({
      where: {
        ...where,
        status: 'APPROVED',
        fromDate: { lte: today },
        toDate: { gte: today }
      }
    });

    // Upcoming holidays
    const upcomingHolidays = await db.holiday.findMany({
      where: {
        holidayDate: { gte: today },
        OR: [
          { companyId: employeeWhere.companyId || null },
          { companyId: null }
        ]
      },
      orderBy: { holidayDate: 'asc' },
      take: 5
    });

    return NextResponse.json({
      success: true,
      data: {
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        onLeaveToday,
        upcomingHolidays
      },
    });
  } catch (error: any) {
    console.error('Leave dashboard stats error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
