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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    const appointment = await db.appointmentForm.findUnique({
      where: { id },
      select: { id: true, status: true, companyId: true },
    });

    if (!appointment) {
      return NextResponse.json({ success: false, message: 'Appointment form not found' }, { status: 404 });
    }

    if (appointment.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: `Cannot reject: already ${appointment.status}` },
        { status: 400 }
      );
    }

    if (user.role === 'ADMIN' && user.adminProfile?.companyId !== appointment.companyId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const appt = await db.appointmentForm.update({
      where: { id },
      data: { status: 'REJECTED', reviewedAt: new Date(), reviewedBy: user.id, rejectionReason: reason || null },
    });

    if (appt.email) {
      const appUser = await db.user.findFirst({ where: { email: appt.email } });
      if (appUser) {
        await db.notification.create({
          data: { userId: appUser.id, title: 'Appointment Rejected', message: `Your appointment application has been rejected.${reason ? ` Reason: ${reason}` : ''}`, type: 'ERROR', link: 'track-application' },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Appointment rejected' });
  } catch (error: any) {
    console.error('Appointment reject error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}