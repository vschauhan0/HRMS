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

    // Get existing bank details for employees that will be updated
    const existingBankDetails = await db.employeeBankDetail.findMany({
      where: {
        employeeId: { in: existingEmployees.map((e) => e.id) },
      },
      select: { employeeId: true, id: true },
    });
    const bankDetailMap = new Map(existingBankDetails.map((b) => [b.employeeId, b.id]));

    let created = 0;
    let updated = 0;

    // Process records sequentially to avoid race conditions
    for (const record of records as Record<string, unknown>[]) {
      const employeeCode = record.employeeCode as string;
      const existingId = existingCodeMap.get(employeeCode);

      // Build common employee data
      const employeeData = {
        firstName: (record.firstName as string).trim(),
        lastName: ((record.lastName as string) || '').trim(),
        email: (record.email as string).toLowerCase().trim(),
        gender: ((record.gender as string) || '').trim() || null,
        pan: ((record.pan as string) || '').trim() || null,
        address: ((record.address as string) || '').trim() || null,
        city: ((record.city as string) || '').trim() || null,
        pin: ((record.pin as string) || '').trim() || null,
        district: ((record.district as string) || '').trim() || null,
        state: ((record.state as string) || '').trim() || null,
        mobile: ((record.mobile as string) || '').trim() || null,
        pfNo: ((record.pfNo as string) || '').trim() || null,
        esiNo: ((record.esiNo as string) || '').trim() || null,
        aadharNumber: ((record.aadharNumber as string) || '').trim() || null,
        department: ((record.department as string) || '').trim() || null,
        designation: ((record.designation as string) || '').trim() || null,
        joiningDate: new Date(record.joiningDate as string),
        dob: record.dob ? new Date(record.dob as string) : null,
        resignationDate: record.resignationDate ? new Date(record.resignationDate as string) : null,
        branchId: record.branchId as string,
      };

      // Extract bank detail from record
      const bankDetail = record.bankDetail as Record<string, unknown> | null;
      const hasBankDetails = bankDetail && (bankDetail.bankName || bankDetail.accountNumber);

      if (existingId) {
        // ── Update existing employee ──
        await db.employee.update({
          where: { id: existingId },
          data: employeeData,
        });

        // Handle bank details
        const existingBankId = bankDetailMap.get(existingId);
        if (hasBankDetails) {
          const bankData = {
            bankName: (bankDetail.bankName as string).trim(),
            accountNumber: (bankDetail.accountNumber as string).trim(),
            ifsc: (bankDetail.ifsc as string).trim(),
            accountHolder: ((bankDetail.accountHolder as string) || `${(record.firstName as string)} ${(record.lastName as string) || ''}`.trim()).trim(),
          };

          if (existingBankId) {
            // Update existing bank detail
            await db.employeeBankDetail.update({
              where: { id: existingBankId },
              data: bankData,
            });
          } else {
            // Create new bank detail
            await db.employeeBankDetail.create({
              data: {
                employeeId: existingId,
                ...bankData,
              },
            });
          }
        }

        updated++;
      } else {
        // ── Create new employee ──
        await db.employee.create({
          data: {
            companyId,
            ...employeeData,
            status: 'PENDING',
            bankDetail: hasBankDetails
              ? {
                  create: {
                    bankName: (bankDetail.bankName as string).trim(),
                    accountNumber: (bankDetail.accountNumber as string).trim(),
                    ifsc: (bankDetail.ifsc as string).trim(),
                    accountHolder: ((bankDetail.accountHolder as string) || `${(record.firstName as string)} ${(record.lastName as string) || ''}`.trim()).trim(),
                  },
                }
              : undefined,
          },
        });

        created++;
      }
    }

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