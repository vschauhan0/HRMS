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
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || '';
    const date = searchParams.get('date') || '';
    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';
    const companyId = searchParams.get('companyId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const where: any = {};

    if (user.role === 'EMPLOYEE') {
      where.employeeId = user.employeeId || '';
    } else if (employeeId) {
      where.employeeId = employeeId;
    } else if (user.role === 'ADMIN') {
      where.employee = { companyId: user.adminProfile?.companyId || '' };
    } else if (user.role === 'SUPER_ADMIN' && companyId) {
      where.employee = { companyId };
    }

    if (date) {
      const d = new Date(date);
      where.date = { gte: new Date(d.setHours(0,0,0,0)), lte: new Date(d.setHours(23,59,59,999)) };
    }
    if (month && year) {
      const m = parseInt(month) - 1;
      const y = parseInt(year);
      where.date = { gte: new Date(y, m, 1), lte: new Date(y, m + 1, 0, 23, 59, 59, 999) };
    }

    const skip = (page - 1) * pageSize;
    let data = await db.attendance.findMany({
      where,
      include: { employee: { include: { company: true, branch: true } } },
      orderBy: { date: 'asc' },
    });

    // Deduplicate records by date and apply Genuine Rule for Sundays
    const seenDays = new Set();
    data = data.filter(record => {
      const dateObj = new Date(record.date);
      const dayKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
      if (seenDays.has(dayKey)) return false;
      seenDays.add(dayKey);
      
      // Genuine Rule: Treat Sundays as Week Off
      if (dateObj.getDay() === 0) {
        record.status = 'WEEK_OFF';
      }
      
      return true;
    });

    const total = data.length;

    // Apply pagination in memory if needed
    const paginatedData = data.slice(skip, skip + pageSize);

    return NextResponse.json({
      success: true,
      data: { data: paginatedData, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    if (user.role === 'EMPLOYEE') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { employeeId, date, status, checkIn, checkOut, remarks } = body;

    if (!employeeId || !date || !status) {
      return NextResponse.json({ success: false, message: 'employeeId, date, and status required' }, { status: 400 });
    }

    const record = await db.attendance.upsert({
      where: { employeeId_date: { employeeId, date: new Date(date) } },
      create: {
        employeeId,
        date: new Date(date),
        status,
        checkIn: checkIn ? new Date(`${date}T${checkIn}`) : null,
        checkOut: checkOut ? new Date(`${date}T${checkOut}`) : null,
        remarks: remarks || null,
      },
      update: {
        status,
        checkIn: checkIn !== undefined ? (checkIn ? new Date(`${date}T${checkIn}`) : null) : undefined,
        checkOut: checkOut !== undefined ? (checkOut ? new Date(`${date}T${checkOut}`) : null) : undefined,
        remarks: remarks !== undefined ? (remarks || null) : undefined,
      },
      include: { employee: { include: { company: true, branch: true } } },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}