import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

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

// PUT - Super admin only: update branch
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
    const { name, code, status, companyId } = body;

    // Check branch exists
    const existingBranch = await db.branch.findUnique({
      where: { id },
      include: { company: true },
    });
    if (!existingBranch) {
      return NextResponse.json({ success: false, message: 'Branch not found' }, { status: 404 });
    }

    // If companyId is being changed, verify the new company exists
    if (companyId && companyId !== existingBranch.companyId) {
      const company = await db.company.findUnique({ where: { id: companyId } });
      if (!company) {
        return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
      }
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (companyId !== undefined) updateData.companyId = companyId;
    if (code !== undefined) updateData.code = code;

    // Update branch (catch P2002 for unique constraint violation on [companyId, code])
    let updatedBranch;
    try {
      updatedBranch = await db.branch.update({
        where: { id },
        data: updateData,
        include: { company: true },
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json(
          { success: false, message: 'Branch code already exists in this company' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, data: updatedBranch });
  } catch (error: any) {
    console.error('Branch update error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Super admin only: delete branch
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

    // Check branch exists
    const existingBranch = await db.branch.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!existingBranch) {
      return NextResponse.json({ success: false, message: 'Branch not found' }, { status: 404 });
    }

    // Check if branch has any employees
    if (existingBranch._count.employees > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Cannot delete branch with existing employees. Reassign or delete all employees first.',
        },
        { status: 400 }
      );
    }

    // Delete the branch
    await db.branch.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error('Branch delete error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}