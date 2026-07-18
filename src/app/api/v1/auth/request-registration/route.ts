import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOTP } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeCode, email } = body;

    if (!employeeCode || !email) {
      return NextResponse.json(
        { success: false, message: 'Employee code and email are required' },
        { status: 400 }
      );
    }

    const employee = await db.employee.findFirst({
      where: {
        employeeCode: employeeCode.trim(),
        email: email.toLowerCase().trim(),
        status: 'PENDING',
      },
      include: { company: true, branch: true },
    });

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          message: 'No pending registration found. Please verify your employee code and email, or contact your administrator.',
        },
        { status: 404 }
      );
    }

    // Check if user already exists for this employee
    const existingUser = await db.user.findFirst({
      where: { employeeId: employee.id },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'This employee is already registered. Please log in instead.' },
        { status: 400 }
      );
    }

    const otp = generateOTP();

    // Delete any existing OTPs for this email
    await db.otpStore.deleteMany({
      where: { email: email.toLowerCase().trim() },
    });

    await db.otpStore.create({
      data: {
        email: email.toLowerCase().trim(),
        otp,
        purpose: 'REGISTRATION',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // In production, send OTP via email. For demo, return in response.
    return NextResponse.json({
      success: true,
      data: { otp },
    });
  } catch (error) {
    console.error('Request registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}