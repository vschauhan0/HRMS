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

// PUT - Super admin only: update company
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

    const existing = await db.company.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, code, status } = body;

    // If code is being changed, check uniqueness
    if (code && code !== existing.code) {
      const duplicate = await db.company.findUnique({ where: { code } });
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: 'Company code already exists' },
          { status: 409 }
        );
      }
    }

    const company = await db.company.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ success: true, data: company });
  } catch (error: any) {
    console.error('Company update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Super admin only: delete company
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

    const existing = await db.company.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true, admins: true, branches: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    // Check if company has any employees
    if (existing._count.employees > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Cannot delete company with existing employees. Delete all employees first.',
        },
        { status: 400 }
      );
    }

    // Warn about cascading deletes for branches and admins
    const cascadeWarnings: string[] = [];
    if (existing._count.branches > 0) {
      cascadeWarnings.push(
        `${existing._count.branches} branch(es) will be deleted (cascade).`
      );
    }
    if (existing._count.admins > 0) {
      cascadeWarnings.push(
        `${existing._count.admins} admin account(s) will be deleted (cascade).`
      );
    }

    await db.company.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      data: {
        id,
        ...(cascadeWarnings.length > 0 && { cascadeWarnings }),
      },
    });
  } catch (error: any) {
    console.error('Company delete error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}