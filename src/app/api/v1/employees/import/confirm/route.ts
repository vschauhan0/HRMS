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
    where: { id: payload.id as string },
    include: {
      adminProfile: { include: { company: true } },
      employee: true,
    },
  });
}

// POST /api/v1/employees/import/confirm - Confirm import
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { records, companyId: bodyCompanyId, branchId: bodyBranchId } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ success: false, message: 'No records provided' }, { status: 400 });
    }

    const companyId: string = authUser.role === 'ADMIN'
      ? (authUser.adminProfile?.companyId ?? '')
      : (bodyCompanyId || '');

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const branchId = bodyBranchId || records[0]?.branchId;
    if (!branchId) {
      return NextResponse.json({ success: false, message: 'Branch is required' }, { status: 400 });
    }

    // Get existing employees
    const existingEmployees = await db.employee.findMany({
      select: { employeeCode: true, id: true },
    });
    const existingCodeMap = new Map(existingEmployees.map((e) => [e.employeeCode, e.id]));

    let created = 0;
    let updated = 0;

    for (const record of records as Record<string, unknown>[]) {
      const employeeCode = record.employeeCode as string;
      const existingId = existingCodeMap.get(employeeCode);

      const data = {
        firstName: ((record.firstName as string) || '').trim(),
        lastName: ((record.lastName as string) || '').trim(),
        email: ((record.email as string) || '').toLowerCase().trim(),
        mobile: ((record.mobile as string) || '').trim() || '-',
        branchId,
      };

      if (existingId) {
        await db.employee.update({ where: { id: existingId }, data });
        updated++;
      } else {
        await db.employee.create({
          data: { ...data, companyId, employeeCode, status: 'PENDING' },
        });
        created++;
      }
    }

    return NextResponse.json({ success: true, data: { created, updated } });
  } catch (error) {
    console.error('Import confirm error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}