import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Public: list active companies (for appointment form)
export async function GET() {
  try {
    const companies = await db.company.findMany({
      where: { status: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: companies,
    });
  } catch (error: any) {
    console.error('Public companies list error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}