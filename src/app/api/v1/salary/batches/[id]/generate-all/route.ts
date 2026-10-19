import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { buildPayslipPDF, mapSlipToPayslipData, getSaveDir } from '@/lib/payslip-builder';
import * as fs from 'fs';
import * as path from 'path';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Fetch the batch with all salary slips
    const batch = await db.salaryBatch.findUnique({
      where: { id },
      include: {
        salarySlips: {
          include: {
            employee: {
              include: {
                company: { select: { id: true, name: true, address: true } },
                branch: { select: { name: true } },
                bankDetail: { select: { bankName: true, accountNumber: true } },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ success: false, message: 'Batch not found' }, { status: 404 });
    }

    // Company access check
    if (user.role === 'ADMIN' && user.adminProfile?.companyId !== batch.companyId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    if (!batch.salarySlips || batch.salarySlips.length === 0) {
      return NextResponse.json({ success: false, message: 'No salary slips in this batch' }, { status: 400 });
    }

    const saveDir = getSaveDir();
    const month = batch.month;
    const year = batch.year;

    // Pre-compute cumulative TDS per employee for this month/year
    // Fetch all unique employee IDs in this batch
    const employeeIds = batch.salarySlips.map((s) => s.employeeId);
    const uniqueEmpIds = Array.from(new Set(employeeIds));

    // For each employee, get cumulative TDS up to this month/year
    const cumulativeTdsMap: Record<string, number> = {};
    for (const empId of uniqueEmpIds) {
      const tdsAgg = await db.salarySlip.aggregate({
        _sum: { tds: true },
        where: {
          employeeId: empId,
          OR: [
            { year: { lt: year } },
            { year, month: { lte: month } },
          ],
        },
      });
      cumulativeTdsMap[empId] = tdsAgg._sum.tds || 0;
    }

    const results: Array<{ slipId: string; employeeCode: string; success: boolean; error?: string; filePath?: string }> = [];
    let generated = 0;
    let failed = 0;

    for (const slip of batch.salarySlips) {
      try {
        const cumulativeTds = cumulativeTdsMap[slip.employeeId] || 0;
        const payslipData = mapSlipToPayslipData(slip as any, cumulativeTds);
        const pdfBuffer = await buildPayslipPDF(payslipData);

        const monthYear = `${String(slip.month).padStart(2, '0')}_${slip.year}`;
        const fileName = `payslip_${slip.employee.employeeCode}_${monthYear}.pdf`;
        const filePath = path.join(saveDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);

        const relativePath = `uploads/payslips/${fileName}`;
        await db.salarySlip.update({
          where: { id: slip.id },
          data: { pdfPath: relativePath },
        });

        results.push({
          slipId: slip.id,
          employeeCode: slip.employee.employeeCode,
          success: true,
          filePath: relativePath,
        });
        generated++;
      } catch (err: any) {
        results.push({
          slipId: slip.id,
          employeeCode: slip.employee.employeeCode,
          success: false,
          error: err.message || 'Unknown error',
        });
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generated} payslip(s), ${failed} failed.`,
      data: {
        total: batch.salarySlips.length,
        generated,
        failed,
        results,
      },
    });
  } catch (error: any) {
    console.error('Batch generate-all error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}