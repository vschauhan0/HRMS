import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { EmployeeStatus } from '@/types';

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
    where: { id: payload.id as string },
    include: {
      adminProfile: { include: { company: true } },
      employee: true,
    },
  });
}

// PATCH /api/v1/employees/[id]/status - Update employee status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (authUser.role === 'EMPLOYEE') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses: EmployeeStatus[] = ['PENDING', 'ACTIVE', 'INACTIVE', 'RESIGNED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify employee exists and is accessible
    const where = { id };
    if (authUser.role === 'ADMIN') {
      const existing = await db.employee.findFirst({
        where: { id, companyId: authUser.adminProfile?.companyId || '' },
      });
      if (!existing) {
        return NextResponse.json(
          { success: false, message: 'Employee not found' },
          { status: 404 }
        );
      }
    }

    const employee = await db.employee.update({
      where: { id },
      data: { status },
      include: {
        company: true,
        branch: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('Update employee status error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}