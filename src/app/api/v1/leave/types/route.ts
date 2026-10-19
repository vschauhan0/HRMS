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

// GET - List all leave types
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const types = await db.leaveType.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: types,
    });
  } catch (error: any) {
    console.error('Leave types list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Super admin only: Create leave type
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
    const { name, isPaid, annualLimit, description, status } = body;

    if (!name || typeof isPaid !== 'boolean' || !annualLimit) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const leaveType = await db.leaveType.create({
      data: {
        name,
        isPaid,
        annualLimit,
        description,
        status: status ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: leaveType,
      message: 'Leave type created successfully',
    });
  } catch (error: any) {
    console.error('Leave type create error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
