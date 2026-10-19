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
  return db.user.findUnique({ where: { id: (payload as any).id } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    if (user.role === 'EMPLOYEE') return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const leaveReq = await db.leaveRequest.findUnique({ 
      where: { id },
      include: { leaveType: true }
    });
    
    if (!leaveReq) return NextResponse.json({ success: false, message: 'Leave request not found' }, { status: 404 });
    if (leaveReq.status !== 'PENDING') return NextResponse.json({ success: false, message: `Already ${leaveReq.status}` }, { status: 400 });

    const year = leaveReq.fromDate.getFullYear();

    // Perform operations in a transaction
    await db.$transaction(async (tx) => {
      // 1. Mark as approved
      await tx.leaveRequest.update({
        where: { id },
        data: { status: 'APPROVED', reviewedBy: user.id, reviewedAt: new Date() },
      });

      // 2. Reduce leave balance if applicable and paid
      if (leaveReq.leaveTypeId && leaveReq.leaveType?.isPaid) {
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: leaveReq.employeeId,
              leaveTypeId: leaveReq.leaveTypeId,
              year
            }
          }
        });
        if (balance) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              usedDays: balance.usedDays + leaveReq.totalDays,
              remainingDays: balance.remainingDays - leaveReq.totalDays
            }
          });
        }
      }

      // 3. Mark attendance
      const dateList: Date[] = [];
      let currentDate = new Date(leaveReq.fromDate);
      while (currentDate <= leaveReq.toDate) {
        dateList.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      for (const d of dateList) {
        const dateStr = d.toISOString().split('T')[0];
        // Skip if already marked? We will upsert attendance
        await tx.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: leaveReq.employeeId,
              date: new Date(`${dateStr}T00:00:00Z`)
            }
          },
          update: {
            status: leaveReq.halfDay ? 'HALF_DAY' : 'LEAVE',
            remarks: 'Leave Approved'
          },
          create: {
            employeeId: leaveReq.employeeId,
            date: new Date(`${dateStr}T00:00:00Z`),
            status: leaveReq.halfDay ? 'HALF_DAY' : 'LEAVE',
            remarks: 'Leave Approved'
          }
        });
      }
    });

    const leaveUser = await db.user.findFirst({ where: { employeeId: leaveReq.employeeId } });
    if (leaveUser) {
      await db.notification.create({
        data: { userId: leaveUser.id, title: 'Leave Approved', message: `Your leave request has been approved.`, type: 'SUCCESS', link: 'my-leaves' },
      });
    }

    return NextResponse.json({ success: true, message: 'Leave approved' });
  } catch (error: any) {
    console.error('Approve error', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}