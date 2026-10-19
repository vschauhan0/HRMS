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
    const body = await request.json();

    const leaveReq = await db.leaveRequest.findUnique({ 
      where: { id },
      include: { leaveType: true }
    });
    if (!leaveReq) return NextResponse.json({ success: false, message: 'Leave request not found' }, { status: 404 });
    if (leaveReq.status !== 'PENDING') return NextResponse.json({ success: false, message: `Already ${leaveReq.status}` }, { status: 400 });

    await db.leaveRequest.update({
      where: { id },
      data: { status: 'REJECTED', reviewedBy: user.id, reviewedAt: new Date(), rejectionReason: body.reason || null },
    });

    const leaveUser = await db.user.findFirst({ where: { employeeId: leaveReq.employeeId } });
    if (leaveUser) {
      await db.notification.create({
        data: { userId: leaveUser.id, title: 'Leave Rejected', message: `Your ${leaveReq.leaveType?.name || ''} leave request has been rejected.${body.reason ? ` Reason: ${body.reason}` : ''}`, type: 'ERROR', link: 'my-leaves' },
      });
    }

    return NextResponse.json({ success: true, message: 'Leave rejected' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}