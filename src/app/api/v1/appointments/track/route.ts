import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Public (no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationNo } = body;

    if (!applicationNo) {
      return NextResponse.json(
        { success: false, message: 'applicationNo is required' },
        { status: 400 }
      );
    }

    const appointment = await db.appointmentForm.findUnique({
      where: { applicationNo },
      select: {
        applicationNo: true,
        fullName: true,
        status: true,
        submittedAt: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, message: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        applicationNo: appointment.applicationNo,
        fullName: appointment.fullName,
        status: appointment.status,
        submittedAt: appointment.submittedAt,
      },
    });
  } catch (error: any) {
    console.error('Track application error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}