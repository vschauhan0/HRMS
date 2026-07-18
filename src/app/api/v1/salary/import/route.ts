import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx');

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

const REQUIRED_COLUMNS = ['Employee Code', 'Gross Salary', 'Net Salary'];
const OPTIONAL_COLUMNS = [
  'Basic Salary', 'HRA', 'DA', 'Conveyance', 'Medical',
  'Special Allowance', 'PF', 'ESI', 'TDS', 'Professional Tax',
  'Other Deduction', 'Total Deduction',
];

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const companyId = formData.get('companyId') as string;
    const branchId = formData.get('branchId') as string;
    const monthStr = formData.get('month') as string;
    const yearStr = formData.get('year') as string;

    if (!file) {
      return NextResponse.json({ success: false, message: 'File is required' }, { status: 400 });
    }
    if (!companyId || !branchId || !monthStr || !yearStr) {
      return NextResponse.json(
        { success: false, message: 'companyId, branchId, month, and year are required' },
        { status: 400 }
      );
    }

    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ success: false, message: 'Invalid month (1-12)' }, { status: 400 });
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ success: false, message: 'Invalid year' }, { status: 400 });
    }

    // Verify company access
    if (user.role === 'ADMIN' && user.adminProfile?.companyId !== companyId) {
      return NextResponse.json({ success: false, message: 'Forbidden: not your company' }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Excel file is empty' }, { status: 400 });
    }

    // Validate columns
    const firstRow = rows[0] as Record<string, unknown>;
    const missingCols = REQUIRED_COLUMNS.filter((col) => !(col in firstRow));
    if (missingCols.length > 0) {
      return NextResponse.json(
        { success: false, message: `Missing required columns: ${missingCols.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch all employees for the company to validate employee codes
    const employees = await db.employee.findMany({
      where: { companyId },
      select: { id: true, employeeCode: true },
    });
    const employeeMap = new Map(employees.map((e) => [e.employeeCode.trim(), e.id]));

    // Fetch existing slips for duplicate check
    const existingSlips = await db.salarySlip.findMany({
      where: { month, year },
      select: { employeeId: true },
    });
    const existingSet = new Set(existingSlips.map((s) => s.employeeId));

    const valid: any[] = [];
    const invalid: { row: number; message: string; data: Record<string, unknown> }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, unknown>;
      const rowNum = i + 2; // Excel row number (1-indexed, header is row 1)

      const employeeCode = String(row['Employee Code'] || '').trim();
      if (!employeeCode) {
        invalid.push({ row: rowNum, message: 'Employee Code is empty', data: row });
        continue;
      }

      const employeeId = employeeMap.get(employeeCode);
      if (!employeeId) {
        invalid.push({ row: rowNum, message: `Employee code "${employeeCode}" not found in company`, data: row });
        continue;
      }

      if (existingSet.has(employeeId)) {
        invalid.push({
          row: rowNum,
          message: `Duplicate: salary already exists for ${month}/${year}`,
          data: row,
        });
        continue;
      }

      const parseNum = (val: unknown, name: string): { ok: true; value: number } | { ok: false; message: string } => {
        if (val === '' || val === null || val === undefined) return { ok: true, value: 0 };
        const num = Number(val);
        if (isNaN(num)) return { ok: false, message: `${name} must be a number, got "${val}"` };
        return { ok: true, value: num };
      };

      const grossResult = parseNum(row['Gross Salary'], 'Gross Salary');
      if (!grossResult.ok) {
        invalid.push({ row: rowNum, message: grossResult.message, data: row });
        continue;
      }
      if (grossResult.value < 0) {
        invalid.push({ row: rowNum, message: 'Gross Salary cannot be negative', data: row });
        continue;
      }

      const netResult = parseNum(row['Net Salary'], 'Net Salary');
      if (!netResult.ok) {
        invalid.push({ row: rowNum, message: netResult.message, data: row });
        continue;
      }

      const totalDeductionResult = parseNum(row['Total Deduction'], 'Total Deduction');

      const basicResult = parseNum(row['Basic Salary'], 'Basic Salary');
      const hraResult = parseNum(row['HRA'], 'HRA');
      const daResult = parseNum(row['DA'], 'DA');
      const conveyanceResult = parseNum(row['Conveyance'], 'Conveyance');
      const medicalResult = parseNum(row['Medical'], 'Medical');
      const specialAllowResult = parseNum(row['Special Allowance'], 'Special Allowance');
      const pfResult = parseNum(row['PF'], 'PF');
      const esiResult = parseNum(row['ESI'], 'ESI');
      const tdsResult = parseNum(row['TDS'], 'TDS');
      const ptResult = parseNum(row['Professional Tax'], 'Professional Tax');
      const otherDedResult = parseNum(row['Other Deduction'], 'Other Deduction');

      valid.push({
        row: rowNum,
        employeeCode,
        employeeId,
        grossSalary: grossResult.value,
        netSalary: netResult.value,
        totalDeduction: totalDeductionResult.ok ? totalDeductionResult.value : 0,
        basicSalary: basicResult.ok ? basicResult.value || null : null,
        hra: hraResult.ok ? hraResult.value || null : null,
        da: daResult.ok ? daResult.value || null : null,
        conveyance: conveyanceResult.ok ? conveyanceResult.value || null : null,
        medical: medicalResult.ok ? medicalResult.value || null : null,
        specialAllow: specialAllowResult.ok ? specialAllowResult.value || null : null,
        pf: pfResult.ok ? pfResult.value || null : null,
        esi: esiResult.ok ? esiResult.value || null : null,
        tds: tdsResult.ok ? tdsResult.value || null : null,
        professionalTax: ptResult.ok ? ptResult.value || null : null,
        otherDeduction: otherDedResult.ok ? otherDedResult.value || null : null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRows: rows.length,
        validCount: valid.length,
        invalidCount: invalid.length,
        valid,
        invalid,
      },
    });
  } catch (error: any) {
    console.error('Salary import preview error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}