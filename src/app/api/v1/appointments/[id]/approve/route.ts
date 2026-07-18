import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, generateEmployeeCode } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';

function getToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function getAuthUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  const payload = verifyToken(token);
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

    const appointment = await db.appointmentForm.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, code: true } },
        branch: { select: { id: true, code: true } },
      },
    });

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

    // Generate employee code
    const employeeCode = generateEmployeeCode(appointment.company.code, appointment.branch.code);

    // Split full name
    const nameParts = appointment.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create employee record
    const employee = await db.employee.create({
      data: {
        companyId: appointment.companyId,
        branchId: appointment.branchId,
        employeeCode,
        firstName,
        lastName,
        email: appointment.email,
        mobile: appointment.mobile,
        joiningDate: new Date(),
        status: 'ACTIVE',
        appointmentFormId: appointment.id,
      },
    });

    // Update appointment status
    await db.appointmentForm.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: { employeeCode },
      message: 'Appointment approved and employee created',
    });
  } catch (error: any) {
    console.error('Appointment approve error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}