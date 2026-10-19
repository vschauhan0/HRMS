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

// GET - List branches
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    const where: any = {};
    if (companyId) {
      where.companyId = companyId;
    } else if (user.role === 'ADMIN') {
      where.companyId = user.adminProfile!.companyId;
    }

    const branches = await db.branch.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, code: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: branches.map((b) => ({
        id: b.id,
        companyId: b.companyId,
        name: b.name,
        code: b.code,
        status: b.status,
        employeeCount: b._count.employees,
        company: b.company,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Branches list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Super admin only: create branch
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
    const { companyId, name, code, status } = body;

    if (!companyId || !name || !code) {
      return NextResponse.json(
        { success: false, message: 'companyId, name, and code are required' },
        { status: 400 }
      );
    }

    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    const branch = await db.branch.create({
      data: {
        companyId,
        name,
        code,
        status: status !== undefined ? status : true,
      },
    });

    return NextResponse.json({ success: true, data: branch }, { status: 201 });
  } catch (error: any) {
    console.error('Branch create error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}