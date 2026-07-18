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
    where: { id: (payload as any).id },
    include: { adminProfile: { include: { company: true } }, employee: true },
  });
}

// GET - Employee profile
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'EMPLOYEE' || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee profile only' }, { status: 403 });
    }

    const employee = await db.employee.findUnique({
      where: { id: user.employeeId },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        bankDetail: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    console.error('Profile get error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update employee profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'EMPLOYEE' || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee profile only' }, { status: 403 });
    }

    const body = await request.json();
    const { email, mobile, address } = body;

    // Only allow updating specific fields
    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (address !== undefined) updateData.address = address;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid fields to update (email, mobile, address)' },
        { status: 400 }
      );
    }

    const updated = await db.employee.update({
      where: { id: user.employeeId },
      data: updateData,
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        bankDetail: true,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Profile updated' });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}