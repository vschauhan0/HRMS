import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOTP } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No account found with this email' },
        { status: 404 }
      );
    }

    const otp = generateOTP();

    // Delete any existing OTPs for this email with PASSWORD_RESET purpose
    await db.otpStore.deleteMany({
      where: {
        email: email.toLowerCase().trim(),
        purpose: 'PASSWORD_RESET',
      },
    });

    await db.otpStore.create({
      data: {
        email: email.toLowerCase().trim(),
        otp,
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // In production, send OTP via email. For demo, return in response.
    return NextResponse.json({
      success: true,
      data: { otp },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}