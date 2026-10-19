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

// GET - List holidays
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const branchId = searchParams.get('branchId');

    const where: any = {};
    
    // If admin, they can only see their company holidays (and universal ones)
    if (user.role === 'ADMIN') {
      where.OR = [
        { companyId: user.adminProfile!.companyId },
        { companyId: null } // Universal holidays
      ];
    } else if (companyId) {
       where.OR = [
        { companyId: companyId },
        { companyId: null }
      ];
    }

    if (branchId) {
      where.branchId = branchId;
    }

    const holidays = await db.holiday.findMany({
      where,
      include: {
        company: { select: { name: true } },
        branch: { select: { name: true } }
      },
      orderBy: { holidayDate: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: holidays,
    });
  } catch (error: any) {
    console.error('Holidays list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Super admin only: Create holiday
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
    const { holidayName, holidayDate, companyId, branchId, description, status } = body;

    if (!holidayName || !holidayDate) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const holiday = await db.holiday.create({
      data: {
        holidayName,
        holidayDate: new Date(holidayDate),
        companyId: companyId || null,
        branchId: branchId || null,
        description,
        status: status ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: holiday,
      message: 'Holiday created successfully',
    });
  } catch (error: any) {
    console.error('Holiday create error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
