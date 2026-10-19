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

// GET - List leave balances
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();

    const where: any = { year };

    if (user.role === 'EMPLOYEE') {
      where.employeeId = user.employeeId;
    } else {
      if (employeeId) {
        where.employeeId = employeeId;
      }
      if (user.role === 'ADMIN') {
        where.employee = { companyId: user.adminProfile!.companyId };
      }
    }

    const balances = await db.leaveBalance.findMany({
      where,
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          }
        }
      },
    });

    return NextResponse.json({
      success: true,
      data: balances,
    });
  } catch (error: any) {
    console.error('Leave balances list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
