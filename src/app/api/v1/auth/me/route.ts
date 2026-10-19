import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function getToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token) as { id: string } | null;
    if (!payload) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: payload.id as string },
      include: {
        adminProfile: { include: { company: true } },
        employee: {
          include: {
            company: true,
            branch: true,
            bankDetail: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        adminProfile: user.adminProfile
          ? {
              id: user.adminProfile.id,
              name: user.adminProfile.name,
              mobile: user.adminProfile.mobile,
              company: user.adminProfile.company,
            }
          : null,
        employee: user.employee ?? null,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}