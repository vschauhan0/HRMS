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
    include: { employee: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const record = await db.attendance.findFirst({
      where: {
        employeeId: user.employeeId || '',
        date: { gte: today, lt: tomorrow },
      },
    });

    return NextResponse.json({ success: true, data: record || null });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action } = body; // 'check-in' or 'check-out'
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (action === 'check-in') {
      const record = await db.attendance.upsert({
        where: { employeeId_date: { employeeId: user.employeeId || '', date: today } },
        create: {
          employeeId: user.employeeId || '',
          date: today,
          checkIn: now,
          status: 'PRESENT',
        },
        update: { checkIn: now },
      });
      return NextResponse.json({ success: true, data: record, message: 'Check-in recorded' });
    }

    if (action === 'check-out') {
      const record = await db.attendance.upsert({
        where: { employeeId_date: { employeeId: user.employeeId || '', date: today } },
        create: {
          employeeId: user.employeeId || '',
          date: today,
          checkOut: now,
          status: 'PRESENT',
        },
        update: { checkOut: now },
      });
      return NextResponse.json({ success: true, data: record, message: 'Check-out recorded' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}