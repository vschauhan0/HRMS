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

// GET /api/v1/employees/search - Global search
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Search query is required' },
        { status: 400 }
      );
    }

    const query = q.trim();

    const where: Record<string, unknown> = {};

    if (authUser.role === 'SUPER_ADMIN') {
      // Can search across all companies
    } else if (authUser.role === 'ADMIN') {
      where.companyId = authUser.adminProfile?.companyId || '';
    } else if (authUser.role === 'EMPLOYEE') {
      where.id = authUser.employeeId || '';
    }

    const employees = await db.employee.findMany({
      where: {
        ...where,
        OR: [
          { employeeCode: { contains: query } },
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { email: { contains: query } },
          { mobile: { contains: query } },
          { pan: { contains: query } },
        ],
      },
      include: {
        company: {
          select: { id: true, name: true, code: true },
        },
        branch: {
          select: { id: true, name: true, code: true },
        },
      },
      take: 20,
      orderBy: { firstName: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error('Search employees error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}