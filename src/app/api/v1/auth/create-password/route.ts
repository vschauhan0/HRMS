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

    // Find the employee by email
    const employee = await db.employee.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        status: 'PENDING',
      },
      include: { company: true, branch: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'No pending employee found with this email' },
        { status: 404 }
      );
    }

    // Check if user already exists for this employee
    const existingUser = await db.user.findFirst({
      where: { employeeId: employee.id },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'This employee is already registered' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // Create User record
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'EMPLOYEE',
        employeeId: employee.id,
      },
    });

    // Update employee status to ACTIVE
    await db.employee.update({
      where: { id: employee.id },
      data: { status: 'ACTIVE' },
    });

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
      companyId: employee.companyId,
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
          adminProfile: null,
          employee: {
            ...employee,
            company: employee.company,
            branch: employee.branch,
          },
        },
      },
    });
  } catch (error) {
    console.error('Create password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}