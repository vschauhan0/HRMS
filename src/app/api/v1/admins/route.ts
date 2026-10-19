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

// GET - Super admin only: list all admin users
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, message: 'Super admin only' }, { status: 403 });
    }

    const admins = await db.user.findMany({
      where: { role: 'ADMIN' },
      include: {
        adminProfile: {
          include: {
            company: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: admins.map((a) => ({
        id: a.id,
        email: a.email,
        role: a.role,
        name: a.adminProfile?.name || null,
        employeeCode: a.adminProfile?.employeeCode || null,
        mobile: a.adminProfile?.mobile || null,
        company: a.adminProfile?.company || null,
        createdAt: a.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Admins list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Super admin only: create admin user
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, message: 'Super admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { name, employeeCode, email, mobile, companyId } = body;

    if (!name || !employeeCode || !email || !companyId) {
      return NextResponse.json(
        { success: false, message: 'name, employeeCode, email, and companyId are required' },
        { status: 400 }
      );
    }

    // Check company exists
    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    // Check email not taken
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'Email already in use' }, { status: 409 });
    }

    const newUser = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: null,
        role: 'ADMIN',
        adminProfile: {
          create: {
            companyId,
            employeeCode: employeeCode.trim(),
            name,
            mobile: mobile || null,
          },
        },
      },
      include: {
        adminProfile: {
          include: {
            company: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          name: newUser.adminProfile?.name,
          employeeCode: newUser.adminProfile?.employeeCode,
          company: newUser.adminProfile?.company,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Admin create error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}