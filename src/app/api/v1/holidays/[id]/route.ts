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
  const payload = verifyToken(token) as { id: string } | null;
  if (!payload) return null;
  return db.user.findUnique({
    where: { id: (payload as any).id },
    include: { adminProfile: { include: { company: true } }, employee: true },
  });
}

// PUT - Super admin only: Update holiday
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, message: 'Super admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { holidayName, holidayDate, companyId, branchId, description, status } = body;

    const holiday = await db.holiday.update({
      where: { id },
      data: {
        holidayName,
        holidayDate: holidayDate ? new Date(holidayDate) : undefined,
        companyId: companyId || null,
        branchId: branchId || null,
        description,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      data: holiday,
      message: 'Holiday updated successfully',
    });
  } catch (error: any) {
    console.error('Holiday update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Super admin only: Delete holiday
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, message: 'Super admin only' }, { status: 403 });
    }

    await db.holiday.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Holiday deleted successfully',
    });
  } catch (error: any) {
    console.error('Holiday delete error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
