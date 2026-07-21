import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Public: list branches by company (for appointment form)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'companyId is required' },
        { status: 400 }
      );
    }

    const branches = await db.branch.findMany({
      where: { companyId, status: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: branches,
    });
  } catch (error: any) {
    console.error('Public branches list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}