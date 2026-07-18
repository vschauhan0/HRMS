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
    where: { id: (payload as any).id },
    include: { adminProfile: { include: { company: true } }, employee: true },
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { records, companyId, branchId, month, year, fileName } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ success: false, message: 'records array is required and must not be empty' }, { status: 400 });
    }
    if (!companyId || !branchId || !month || !year || !fileName) {
      return NextResponse.json(
        { success: false, message: 'companyId, branchId, month, year, and fileName are required' },
        { status: 400 }
      );
    }

    // Verify company access
    if (user.role === 'ADMIN' && user.adminProfile?.companyId !== companyId) {
      return NextResponse.json({ success: false, message: 'Forbidden: not your company' }, { status: 403 });
    }

    // Create salary batch
    const batch = await db.salaryBatch.create({
      data: {
        companyId,
        branchId,
        month,
        year,
        uploadedBy: user.id,
        fileName,
        importedRecords: records.length,
      },
    });

    // Create salary slips using upsert
    for (const record of records) {
      await db.salarySlip.upsert({
        where: {
          employeeId_month_year: {
            employeeId: record.employeeId,
            month,
            year,
          },
        },
        create: {
          batchId: batch.id,
          employeeId: record.employeeId,
          month,
          year,
          grossSalary: record.grossSalary,
          netSalary: record.netSalary,
          totalDeduction: record.totalDeduction || 0,
          basicSalary: record.basicSalary ?? null,
          hra: record.hra ?? null,
          da: record.da ?? null,
          conveyance: record.conveyance ?? null,
          medical: record.medical ?? null,
          specialAllow: record.specialAllow ?? null,
          pf: record.pf ?? null,
          esi: record.esi ?? null,
          tds: record.tds ?? null,
          professionalTax: record.professionalTax ?? null,
          otherDeduction: record.otherDeduction ?? null,
        },
        update: {
          batchId: batch.id,
          grossSalary: record.grossSalary,
          netSalary: record.netSalary,
          totalDeduction: record.totalDeduction || 0,
          basicSalary: record.basicSalary ?? null,
          hra: record.hra ?? null,
          da: record.da ?? null,
          conveyance: record.conveyance ?? null,
          medical: record.medical ?? null,
          specialAllow: record.specialAllow ?? null,
          pf: record.pf ?? null,
          esi: record.esi ?? null,
          tds: record.tds ?? null,
          professionalTax: record.professionalTax ?? null,
          otherDeduction: record.otherDeduction ?? null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        batchId: batch.id,
        importedRecords: records.length,
      },
    });
  } catch (error: any) {
    console.error('Salary import confirm error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}