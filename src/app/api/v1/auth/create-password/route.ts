import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

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

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if there's a verified OTP for this email with purpose='REGISTRATION'
    const otpRecord = await db.otpStore.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        purpose: 'REGISTRATION',
        verified: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: 'No verified OTP found. Please verify your OTP first.' },
        { status: 400 }
      );
    }

    // Check if this is an Admin registration
    const adminUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { adminProfile: { include: { company: true } } },
    });

    const isAdminRegistration = adminUser && adminUser.role === 'ADMIN' && adminUser.password === null;
    let employee: any = null;

    if (!isAdminRegistration) {
      employee = await db.employee.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          status: 'PENDING',
        },
        include: { company: true, branch: true },
      });

      if (!employee) {
        return NextResponse.json(
          { success: false, message: 'No pending registration found with this email' },
          { status: 404 }
        );
      }

      const existingUserByEmpId = await db.user.findFirst({
        where: { employeeId: employee.id },
      });

      if (existingUserByEmpId) {
        return NextResponse.json(
          { success: false, message: 'This employee is already registered' },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await hashPassword(password);
    let user;

    if (isAdminRegistration) {
      // Complete Admin Registration
      user = await db.user.update({
        where: { id: adminUser!.id },
        data: { password: hashedPassword },
      });
    } else {
      // Complete Employee Registration
      user = await db.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (user) {
        if (user.employeeId && user.employeeId !== employee!.id) {
          return NextResponse.json(
            { success: false, message: 'This email is already registered to another employee' },
            { status: 400 }
          );
        }
        user = await db.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            employeeId: employee!.id,
            role: user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? user.role : 'EMPLOYEE',
          },
        });
      } else {
        user = await db.user.create({
          data: {
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'EMPLOYEE',
            employeeId: employee!.id,
          },
        });
      }

      await db.employee.update({
        where: { id: employee!.id },
        data: { status: 'ACTIVE' },
      });
    }

    // Delete the OTP record
    await db.otpStore.delete({
      where: { id: otpRecord.id },
    });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      companyId: isAdminRegistration ? adminUser!.adminProfile?.companyId : employee!.companyId,
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
          adminProfile: isAdminRegistration ? adminUser!.adminProfile : null,
          employee: employee ? {
            ...employee,
            company: employee.company,
            branch: employee.branch,
          } : null,
        },
      },
    });
  } catch (error) {
    console.error('Create password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}