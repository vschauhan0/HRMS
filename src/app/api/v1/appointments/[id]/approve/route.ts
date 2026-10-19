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

    const appointment = await db.appointmentForm.findUnique({ where: { id } });

    if (!appointment) {
      return NextResponse.json({ success: false, message: 'Appointment form not found' }, { status: 404 });
    }

    if (appointment.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: `Cannot approve: already ${appointment.status}` },
        { status: 400 }
      );
    }

    if (user.role === 'ADMIN' && user.adminProfile?.companyId !== appointment.companyId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    await db.appointmentForm.update({
      where: { id },
      data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: user.id },
    });

    // Notify the employee who applied
    if (appointment.email) {
      const appUser = await db.user.findFirst({ where: { email: appointment.email } });
      if (appUser) {
        await db.notification.create({
          data: { userId: appUser.id, title: 'Appointment Approved', message: 'Your appointment application has been approved.', type: 'SUCCESS', link: 'track-application' },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Appointment approved' });
  } catch (error: any) {
    console.error('Appointment approve error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}