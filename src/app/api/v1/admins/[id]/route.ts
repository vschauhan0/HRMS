import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, hashPassword } from '@/lib/auth';

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

// PUT - Super admin only: update admin user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, message: 'Super admin only' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, password, mobile, companyId } = body;

    if (!name || !email || !companyId) {
      return NextResponse.json(
        { success: false, message: 'name, email, and companyId are required' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id },
      include: { adminProfile: true }
    });

    if (!targetUser || targetUser.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 });
    }

    // Check email uniqueness if changed
    if (email !== targetUser.email) {
      const existingEmail = await db.user.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json({ success: false, message: 'Email already in use' }, { status: 409 });
      }
    }

    // Update user
    const updateData: any = {
      email,
    };

    if (password) {
      updateData.password = await hashPassword(password);
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: {
        ...updateData,
        adminProfile: {
          update: {
            name,
            mobile: mobile || null,
            companyId,
          }
        }
      },
      include: {
        adminProfile: {
          include: {
            company: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        name: updatedUser.adminProfile?.name,
        company: updatedUser.adminProfile?.company,
      },
    });
  } catch (error: any) {
    console.error('Admin update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Super admin only: delete admin user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, message: 'Super admin only' }, { status: 403 });
    }

    const { id } = await params;

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id },
    });

    if (!targetUser || targetUser.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Admin not found' }, { status: 404 });
    }

    // Because of onDelete: Cascade on user relation, deleting User will delete AdminProfile
    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error: any) {
    console.error('Admin delete error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
