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
  const payload = verifyToken(token) as { id: string } | null;
  if (!payload) return null;
  return db.user.findUnique({
    where: { id: payload.id as string },
    include: {
      adminProfile: { include: { company: true } },
      employee: true,
    },
  });
}

// GET /api/v1/employees/[id] - Get single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const where: Prisma.EmployeeWhereInput = { id };

    // Filter by company based on role
    if (authUser.role === 'ADMIN') {
      where.companyId = authUser.adminProfile?.companyId || '';
    } else if (authUser.role === 'EMPLOYEE') {
      where.id = authUser.employeeId || '';
    }

    const employee = await db.employee.findFirst({
      where,
      include: {
        company: true,
        branch: true,
        bankDetail: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('Get employee error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/v1/employees/[id] - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (authUser.role === 'EMPLOYEE') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Verify employee exists and belongs to accessible company
    const where: Prisma.EmployeeWhereUniqueInput = { id };
    if (authUser.role === 'ADMIN') {
      const existing = await db.employee.findFirst({
        where: { id, companyId: authUser.adminProfile?.companyId || '' },
      });
      if (!existing) {
        return NextResponse.json(
          { success: false, message: 'Employee not found' },
          { status: 404 }
        );
      }
    }

    const updateData: Prisma.EmployeeUpdateInput = {};

    if (body.firstName !== undefined) updateData.firstName = body.firstName.trim();
    if (body.lastName !== undefined) updateData.lastName = body.lastName.trim();
    if (body.email !== undefined) updateData.email = body.email.toLowerCase().trim();
    if (body.mobile !== undefined) updateData.mobile = body.mobile.trim();
    if (body.pan !== undefined) updateData.pan = body.pan?.trim() || null;
    if (body.joiningDate !== undefined) updateData.joiningDate = new Date(body.joiningDate);
    if (body.department !== undefined) updateData.department = body.department?.trim() || null;
    if (body.designation !== undefined) updateData.designation = body.designation?.trim() || null;
    if (body.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body.profilePhoto !== undefined) updateData.profilePhoto = body.profilePhoto || null;
    if (body.gender !== undefined) updateData.gender = body.gender || null;
    if (body.city !== undefined) updateData.city = body.city?.trim() || null;
    if (body.pin !== undefined) updateData.pin = body.pin?.trim() || null;
    if (body.district !== undefined) updateData.district = body.district?.trim() || null;
    if (body.state !== undefined) updateData.state = body.state?.trim() || null;
    if (body.pfNo !== undefined) updateData.pfNo = body.pfNo?.trim() || null;
    if (body.esiNo !== undefined) updateData.esiNo = body.esiNo?.trim() || null;
    if (body.aadharNumber !== undefined) updateData.aadharNumber = body.aadharNumber?.trim() || null;
    if (body.uan !== undefined) updateData.uan = body.uan?.trim() || null;
    if (body.dob !== undefined) updateData.dob = body.dob ? new Date(body.dob) : null;
    if (body.resignationDate !== undefined) updateData.resignationDate = body.resignationDate ? new Date(body.resignationDate) : null;

    // Handle bank details
    if (body.bankName !== undefined || body.accountNumber !== undefined || body.ifsc !== undefined || body.accountHolder !== undefined) {
      updateData.bankDetail = {
        upsert: {
          create: {
            bankName: body.bankName?.trim() || '',
            accountNumber: body.accountNumber?.trim() || '',
            ifsc: body.ifsc?.trim() || '',
            accountHolder: body.accountHolder?.trim() || '',
          },
          update: {
            ...(body.bankName !== undefined && { bankName: body.bankName.trim() }),
            ...(body.accountNumber !== undefined && { accountNumber: body.accountNumber.trim() }),
            ...(body.ifsc !== undefined && { ifsc: body.ifsc.trim() }),
            ...(body.accountHolder !== undefined && { accountHolder: body.accountHolder.trim() }),
          },
        },
      };
    }

    if (body.branchId) {
      // Verify branch belongs to employee's company
      const employee = await db.employee.findUnique({ where: { id } });
      if (employee) {
        const branch = await db.branch.findFirst({
          where: { id: body.branchId, companyId: employee.companyId },
        });
        if (!branch) {
          return NextResponse.json(
            { success: false, message: 'Invalid branch for the employee\'s company' },
            { status: 400 }
          );
        }
        updateData.branch = { connect: { id: body.branchId } };
      }
    }

    const employee = await db.employee.update({
      where: { id },
      data: updateData,
      include: { company: true, branch: true, bankDetail: true },
    });

    const empUser = await db.user.findFirst({ where: { employeeId: id } });
    if (empUser) {
      await db.notification.create({
        data: { userId: empUser.id, title: 'Profile Updated', message: 'Your employee profile has been updated.', type: 'INFO', link: 'my-profile' },
      });
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/employees/[id] - Delete employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    if (authUser.role === 'EMPLOYEE') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const where: Prisma.EmployeeWhereUniqueInput = { id };
    if (authUser.role === 'ADMIN') {
      const existing = await db.employee.findFirst({ where: { id, companyId: authUser.adminProfile?.companyId || '' } });
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
      }
    }

    await db.employee.delete({ where: { id } });

    return NextResponse.json({ success: true, data: null, message: 'Employee deleted' });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}