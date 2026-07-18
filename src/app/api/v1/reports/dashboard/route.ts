import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queryCompanyId = searchParams.get('companyId') || '';

    const companyWhere: any = {};
    if (user.role === 'ADMIN') {
      companyWhere.id = user.adminProfile!.companyId;
    } else if (user.role === 'SUPER_ADMIN' && queryCompanyId) {
      companyWhere.id = queryCompanyId;
    }

    const [
      totalEmployees,
      activeEmployees,
      pendingRegistrations,
      resignedEmployees,
      salaryBatches,
      pendingAppointments,
      totalForm16,
    ] = await Promise.all([
      db.employee.count({ where: { company: companyWhere } }),
      db.employee.count({ where: { company: companyWhere, status: 'ACTIVE' } }),
      db.employee.count({ where: { company: companyWhere, status: 'PENDING' } }),
      db.employee.count({ where: { company: companyWhere, status: 'RESIGNED' } }),
      db.salaryBatch.count({
        where: companyWhere.id
          ? { companyId: companyWhere.id }
          : {},
      }),
      db.appointmentForm.count({
        where: {
          ...(companyWhere.id ? { companyId: companyWhere.id } : {}),
          status: 'PENDING',
        },
      }),
      db.form16Document.count({
        where: companyWhere.id
          ? { employee: { companyId: companyWhere.id } }
          : {},
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        pendingRegistrations,
        resignedEmployees,
        salaryBatches,
        pendingAppointments,
        totalForm16,
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}