import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOTP } from '@/lib/auth';
import { sendEmail } from '@/lib/mail';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeCode, email } = body;

    if (!email || !employeeCode) {
      return NextResponse.json(
        { success: false, message: 'Email and employee code are required' },
        { status: 400 }
      );
    }

    // 1. First, check if there's a pending Employee matching code and email
    const employee = await db.employee.findFirst({
      where: {
        employeeCode: employeeCode.trim(),
        email: email.toLowerCase().trim(),
        status: 'PENDING',
      },
    });

    let isAdmin = false;
    let adminProfile: any = null;

    if (!employee) {
      // 2. If not an employee, check if there's an Admin with this code and email
      adminProfile = await db.adminProfile.findFirst({
        where: {
          employeeCode: employeeCode.trim(),
        } as any,
        include: { user: true },
      });

      if (!adminProfile || adminProfile.user.email.toLowerCase().trim() !== email.toLowerCase().trim() || adminProfile.user.password !== null) {
        return NextResponse.json(
          { success: false, message: 'Invalid employee/admin code or email, or already registered.' },
          { status: 400 }
        );
      }
      isAdmin = true;
    } else {
      const existingUser = await db.user.findFirst({
        where: { employeeId: employee.id },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: 'This employee is already registered. Please log in instead.' },
          { status: 400 }
        );
      }
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

    await sendEmail({
      to: email,
      subject: 'Your Registration OTP',
      html: `<p>Your OTP for registration is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`,
    });

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error) {
    console.error('Request registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}