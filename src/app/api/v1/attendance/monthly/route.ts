import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import type { MonthlyAttendanceSummary } from '@/types';

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
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    // Employees don't have access to this overarching monthly dashboard
    if (user.role === 'EMPLOYEE') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const companyId = searchParams.get('companyId') || '';
    const branchId = searchParams.get('branchId') || '';
    const department = searchParams.get('department') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const where: any = {};

    if (user.role === 'ADMIN') {
      where.companyId = user.adminProfile?.companyId || '';
    } else if (user.role === 'SUPER_ADMIN' && companyId) {
      where.companyId = companyId;
    }

    if (branchId) where.branchId = branchId;
    if (department) where.department = department;

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const m = month - 1;
    const startDate = new Date(year, m, 1);
    const endDate = new Date(year, m + 1, 0, 23, 59, 59, 999);

    const skip = (page - 1) * pageSize;
    const [employees, total] = await Promise.all([
      db.employee.findMany({
        where,
        include: {
          company: true,
          branch: true,
          attendanceRecords: {
            where: {
              date: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
        orderBy: { firstName: 'asc' },
        skip,
        take: pageSize,
      }),
      db.employee.count({ where }),
    ]);

    const daysInMonth = new Date(year, month, 0).getDate();

    const data: MonthlyAttendanceSummary[] = employees.map(emp => {
      let present = 0;
      let absent = 0;
      let leave = 0;
      let holiday = 0;
      let weekOff = 0;
      let late = 0;
      let halfDay = 0;

      const seenDays = new Set();

      emp.attendanceRecords.forEach(record => {
        const dateObj = new Date(record.date);
        const dayKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
        if (seenDays.has(dayKey)) return;
        seenDays.add(dayKey);

        let s = record.status.toUpperCase();
        
        // Genuine Rule: Treat Sundays as Week Off
        if (dateObj.getDay() === 0) {
          s = 'WEEK_OFF';
        }

        if (s === 'PRESENT') present++;
        else if (s === 'ABSENT') absent++;
        else if (s === 'LEAVE') leave++;
        else if (s === 'HOLIDAY') holiday++;
        else if (s === 'WEEK_OFF') weekOff++;
        else if (s === 'LATE') late++;
        else if (s === 'HALF_DAY') halfDay++;
      });

      // Total Working Days can be calculated as total days in month minus holidays and week-offs
      // Alternatively, it can just be Present + Late + HalfDay + Absent + Leave
      // Here we assume a simple summation for "Working Days" count if it's the total days they were supposed to work.
      // Usually Total Working Days = Month Days - Holidays - Week Offs.
      const totalWorkingDays = daysInMonth - holiday - weekOff;
      
      // Attendance percentage: (Present + Late + (HalfDay * 0.5)) / Total Working Days * 100
      let attendancePercentage = 0;
      if (totalWorkingDays > 0) {
        attendancePercentage = Math.round(((present + late + (halfDay * 0.5)) / totalWorkingDays) * 100);
      }

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        company: emp.company?.name || '-',
        branch: emp.branch?.name || '-',
        department: emp.department || '-',
        present,
        absent,
        leave,
        holiday,
        weekOff,
        late,
        halfDay,
        totalWorkingDays,
        attendancePercentage,
      };
    });

    return NextResponse.json({
      success: true,
      data: { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
