import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        adminProfile: { include: { company: true } },
        employee: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    let companyId: string | null = null;

    if (user.role === 'SUPER_ADMIN') {
      companyId = null;
    } else if (user.role === 'ADMIN') {
      companyId = user.adminProfile?.companyId ?? null;
    } else if (user.role === 'EMPLOYEE') {
      companyId = user.employee?.companyId ?? null;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      companyId,
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          adminProfile: user.adminProfile
            ? {
                name: user.adminProfile.name,
                mobile: user.adminProfile.mobile,
                company: user.adminProfile.company,
              }
            : null,
          employee: user.employee ?? null,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}