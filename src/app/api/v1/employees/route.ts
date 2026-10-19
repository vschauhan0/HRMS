import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, generateEmployeeCode } from '@/lib/auth';
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

// GET /api/v1/employees - List employees
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const companyId = searchParams.get('companyId') || '';
    const branchId = searchParams.get('branchId') || '';

    const where: Prisma.EmployeeWhereInput = {};

    // Filter by company based on role
    if (authUser.role === 'SUPER_ADMIN') {
      if (companyId) {
        where.companyId = companyId;
      }
    } else if (authUser.role === 'ADMIN') {
      where.companyId = authUser.adminProfile?.companyId || '';
    } else if (authUser.role === 'EMPLOYEE') {
      // Employees can only see themselves
      where.id = authUser.employeeId || '';
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { employeeCode: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { mobile: { contains: search } },
        { pan: { contains: search } },
      ];
    }

    const skip = (page - 1) * pageSize;

    const [employees, total] = await Promise.all([
      db.employee.findMany({
        where,
        include: {
          company: true,
          branch: true,
          bankDetail: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.employee.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: {
        data: employees,
        total,
        page,
        pageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error('List employees error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/employees - Create employee
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }
    if (authUser.role === 'EMPLOYEE') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, mobile, employeeCode, branchId, companyId: bodyCompanyId } = body;

    if (!firstName || !lastName || !email || !mobile || !employeeCode || !branchId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: firstName, lastName, email, mobile, employeeCode, branchId' },
        { status: 400 }
      );
    }

    let targetCompanyId: string;
    if (authUser.role === 'SUPER_ADMIN') {
      targetCompanyId = bodyCompanyId;
      if (!targetCompanyId) return NextResponse.json({ success: false, message: 'companyId is required' }, { status: 400 });
    } else {
      targetCompanyId = authUser.adminProfile?.companyId ?? '';
    }

    const branch = await db.branch.findFirst({
      where: { id: branchId, companyId: targetCompanyId },
    });
    if (!branch) {
      return NextResponse.json({ success: false, message: 'Invalid branch' }, { status: 400 });
    }

    const existingEmail = await db.employee.findFirst({ where: { email: email.toLowerCase().trim() } });
    if (existingEmail) {
      return NextResponse.json({ success: false, message: 'Employee with this email already exists' }, { status: 409 });
    }

    const existingCode = await db.employee.findFirst({ where: { employeeCode } });
    if (existingCode) {
      return NextResponse.json({ success: false, message: 'Employee code already exists' }, { status: 409 });
    }

    const employee = await db.employee.create({
      data: {
        companyId: targetCompanyId,
        branchId,
        employeeCode,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        mobile: mobile.trim(),
        status: 'PENDING',
      },
      include: { company: true, branch: true },
    });

    const empUser = await db.user.findFirst({ where: { employeeId: employee.id } });
    if (empUser) {
      await db.notification.create({
        data: { userId: empUser.id, title: 'Profile Created', message: 'Your employee profile has been created. Please complete your details.', type: 'INFO', link: 'my-profile' },
      });
    }

    return NextResponse.json({ success: true, data: employee }, { status: 201 });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}