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

// POST - Assign leave balances
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role === 'EMPLOYEE') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, leaveTypeId, allocatedDays, year } = body;

    if (!employeeId || !leaveTypeId || allocatedDays === undefined || !year) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // Check if employee exists and belongs to admin's company if admin
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
    }
    if (user.role === 'ADMIN' && employee.companyId !== user.adminProfile?.companyId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    // Upsert the balance
    const balance = await db.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId,
          leaveTypeId,
          year,
        }
      },
      update: {
        allocatedDays,
        remainingDays: allocatedDays - (body.usedDays || 0), // Normally, usedDays shouldn't shrink manually, but keeping logic simple
      },
      create: {
        employeeId,
        leaveTypeId,
        allocatedDays,
        usedDays: 0,
        remainingDays: allocatedDays,
        year,
      }
    });

    return NextResponse.json({
      success: true,
      data: balance,
      message: 'Leave balance assigned successfully',
    });
  } catch (error: any) {
    console.error('Leave balance assign error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
