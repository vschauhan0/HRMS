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

    const { id } = await params;
    const leaveReq = await db.leaveRequest.findUnique({ where: { id } });
    if (!leaveReq) return NextResponse.json({ success: false, message: 'Leave request not found' }, { status: 404 });
    
    // Only employee who created it can cancel
    if (user.role === 'EMPLOYEE' && leaveReq.employeeId !== user.employeeId) {
       return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    if (leaveReq.status !== 'PENDING') return NextResponse.json({ success: false, message: `Cannot cancel ${leaveReq.status} leave` }, { status: 400 });

    await db.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ success: true, message: 'Leave cancelled' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
