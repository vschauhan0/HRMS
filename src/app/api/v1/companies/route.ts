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

// GET - Super admin only: list companies
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, message: 'Super admin only' }, { status: 403 });
    }

    const companies = await db.company.findMany({
      include: {
        _count: {
          select: { branches: true, employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: companies.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        themeColor: c.themeColor,
        status: c.status,
        branchCount: c._count.branches,
        employeeCount: c._count.employees,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Companies list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Super admin only: create company
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
    const { name, code, status } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: 'name and code are required' },
        { status: 400 }
      );
    }

    const existing = await db.company.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Company code already exists' },
        { status: 409 }
      );
    }

    const company = await db.company.create({
      data: {
        name,
        code,
        status: status !== undefined ? status : true,
      },
    });

    return NextResponse.json({ success: true, data: company }, { status: 201 });
  } catch (error: any) {
    console.error('Company create error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}