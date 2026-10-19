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
    const status = searchParams.get('status') || '';
    const companyId = searchParams.get('companyId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const where: any = {};

    if (user.role === 'EMPLOYEE') {
      where.employeeId = user.employeeId || '';
    } else if (user.role === 'ADMIN') {
      where.employee = { companyId: user.adminProfile?.companyId || '' };
    } else if (user.role === 'SUPER_ADMIN' && companyId) {
      where.employee = { companyId };
    }

    if (status) where.status = status;

    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      db.leaveRequest.findMany({
        where,
        include: { 
          employee: { include: { company: true, branch: true } },
          leaveType: true 
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.leaveRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'EMPLOYEE') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leaveTypeId, fromDate, toDate, totalDays, halfDay, reason, attachment } = body;

    if (!leaveTypeId || !fromDate || !toDate || totalDays === undefined || !reason) {
      return NextResponse.json({ success: false, message: 'leaveTypeId, fromDate, toDate, totalDays, reason required' }, { status: 400 });
    }

    // Overlap check
    const overlapping = await db.leaveRequest.findFirst({
      where: {
        employeeId: user.employeeId!,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          { fromDate: { lte: new Date(toDate) }, toDate: { gte: new Date(fromDate) } }
        ]
      }
    });

    if (overlapping) {
      return NextResponse.json({ success: false, message: 'Leave dates overlap with an existing request' }, { status: 400 });
    }

    // Balance check
    const balance = await db.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: user.employeeId!,
          leaveTypeId,
          year: new Date(fromDate).getFullYear(),
        }
      }
    });

    const requestedType = await db.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (requestedType?.isPaid) {
      if (!balance || balance.remainingDays < totalDays) {
        return NextResponse.json({ success: false, message: 'Insufficient leave balance' }, { status: 400 });
      }
    }

    const record = await db.leaveRequest.create({
      data: {
        employeeId: user.employeeId!,
        leaveTypeId,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        totalDays,
        halfDay,
        reason,
        attachment,
        status: 'PENDING'
      },
      include: { employee: { include: { company: true, branch: true } } },
    });

    // Notify admins
    if (record.employee?.companyId) {
      const admins = await db.user.findMany({
        where: { role: 'ADMIN', adminProfile: { companyId: record.employee.companyId } },
      });
      for (const admin of admins) {
        await db.notification.create({
          data: { userId: admin.id, title: 'New Leave Request', message: `${record.employee.firstName} ${record.employee.lastName} applied for leave.`, type: 'INFO', link: 'leaves' },
        });
      }
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error('Apply leave error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}