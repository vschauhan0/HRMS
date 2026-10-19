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

    const { id } = await params;

    // Fetch the salary slip with all required relations
    const slip = await db.salarySlip.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            company: { select: { id: true, name: true, address: true } },
            branch: { select: { name: true } },
            bankDetail: { select: { bankName: true, accountNumber: true } },
          },
        },
        batch: { select: { companyId: true, branchId: true } },
      },
    });

    if (!slip) {
      return NextResponse.json({ success: false, message: 'Salary slip not found' }, { status: 404 });
    }

    // Access control
    if (user.role === 'EMPLOYEE') {
      if (slip.employeeId !== user.employee!.id) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }
    } else if (user.role === 'ADMIN') {
      if (slip.batch.companyId !== user.adminProfile!.companyId) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }
    }

    // Calculate cumulative TDS for this employee up to this month/year (inclusive)
    const tdsAgg = await db.salarySlip.aggregate({
      _sum: { tds: true },
      where: {
        employeeId: slip.employeeId,
        OR: [
          { year: { lt: slip.year } },
          { year: slip.year, month: { lte: slip.month } },
        ],
      },
    });
    const cumulativeTds = tdsAgg._sum.tds || 0;

    // Map slip data to payslip data
    const payslipData = mapSlipToPayslipData(slip as any, cumulativeTds);

    // Generate the PDF buffer
    const pdfBuffer = await buildPayslipPDF(payslipData);

    // Save to disk
    const saveDir = getSaveDir();
    const monthYear = `${String(slip.month).padStart(2, '0')}_${slip.year}`;
    const fileName = `payslip_${slip.employee.employeeCode}_${monthYear}.pdf`;
    const filePath = path.join(saveDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    // Update the salarySlip.pdfPath
    const relativePath = `uploads/payslips/${fileName}`;
    await db.salarySlip.update({
      where: { id },
      data: { pdfPath: relativePath },
    });

    // Return the PDF as a download
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Payslip generate error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}