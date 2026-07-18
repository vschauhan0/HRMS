import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, generateEmployeeCode } from '@/lib/auth';

function getToken(request: Request): string | null {
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function getAuthUser(request: Request) {
  const token = getToken(request);
  if (!token) return null;
  const payload = verifyToken(token);
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
    const { records, companyId: bodyCompanyId } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No records provided' },
        { status: 400 }
      );
    }

    const companyId = authUser.role === 'ADMIN'
      ? (authUser.adminProfile?.companyId ?? '')
      : bodyCompanyId;

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Get existing employees to determine new vs update
    const existingEmployees = await db.employee.findMany({
      where: { companyId },
      select: { employeeCode: true, id: true },
    });

    const existingCodeMap = new Map(existingEmployees.map((e) => [e.employeeCode, e.id]));

    // Get all branches for the company
    const branches = await db.branch.findMany({
      where: { companyId },
    });
    const branchMap = new Map(branches.map((b) => [b.id, b]));

    let created = 0;
    let updated = 0;

    // Process in batches using Promise.all
    const promises = records.map(async (record: Record<string, unknown>) => {
      const employeeCode = record.employeeCode as string;
      const existingId = existingCodeMap.get(employeeCode);

      if (existingId) {
        // Update existing employee
        await db.employee.update({
          where: { id: existingId },
          data: {
            firstName: (record.firstName as string).trim(),
            lastName: (record.lastName as string).trim(),
            email: (record.email as string).toLowerCase().trim(),
            mobile: (record.mobile as string).trim(),
            pan: (record.pan as string)?.trim() || null,
            joiningDate: new Date(record.joiningDate as string),
            branchId: record.branchId as string,
            department: (record.department as string)?.trim() || null,
            designation: (record.designation as string)?.trim() || null,
            address: (record.address as string)?.trim() || null,
          },
        });
        updated++;
      } else {
        // Create new employee
        const branchId = record.branchId as string;
        const branch = branchMap.get(branchId);
        const companyCode = branch?.company?.code || '';

        // Use provided employee code or generate one
        let code = employeeCode;
        if (!code) {
          const branchCode = branch?.code || 'XXX';
          code = generateEmployeeCode(companyCode, branchCode);
        }

        await db.employee.create({
          data: {
            companyId,
            branchId,
            employeeCode: code,
            firstName: (record.firstName as string).trim(),
            lastName: (record.lastName as string).trim(),
            email: (record.email as string).toLowerCase().trim(),
            mobile: (record.mobile as string).trim(),
            pan: (record.pan as string)?.trim() || null,
            joiningDate: new Date(record.joiningDate as string),
            department: (record.department as string)?.trim() || null,
            designation: (record.designation as string)?.trim() || null,
            address: (record.address as string)?.trim() || null,
            status: 'PENDING',
          },
        });
        created++;
      }
    });

    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      data: { created, updated },
    });
  } catch (error) {
    console.error('Import confirm error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}