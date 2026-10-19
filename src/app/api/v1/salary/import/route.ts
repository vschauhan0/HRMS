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
  const payload = verifyToken(token) as { id: string } | null;
  if (!payload) return null;
  return db.user.findUnique({
    where: { id: (payload as any).id },
    include: { adminProfile: { include: { company: true } }, employee: true },
  });
}

const MONTH_NAMES: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4,
  may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4,
  jun: 6, jul: 7, aug: 8, sep: 9,
  oct: 10, nov: 11, dec: 12,
};

function parseMonthValue(val: unknown): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const str = String(val).trim().toLowerCase();
  // Try numeric
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  // Try month name
  if (MONTH_NAMES[str] !== undefined) return MONTH_NAMES[str];
  return null;
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

    let month = parseInt(monthStr, 10);
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

    // Fetch all employees for the company to validate employee codes
    const employees = await db.employee.findMany({
      where: { companyId },
      select: { id: true, employeeCode: true, resignationDate: true, status: true },
    });
    const employeeMap = new Map(employees.map((e) => [e.employeeCode.trim(), e]));

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

      const emp = employeeMap.get(employeeCode);
      if (!emp) {
        invalid.push({ row: rowNum, message: `Employee code "${employeeCode}" not found in company`, data: row });
        continue;
      }

      // Skip if employee has resigned (has a resignation date)
      const resignationDate = row['Resignation Date'];
      if (resignationDate && resignationDate !== '' && resignationDate !== null && resignationDate !== undefined) {
        invalid.push({ row: rowNum, message: `Employee "${employeeCode}" has resigned`, data: row });
        continue;
      }

      // Allow Month column in the row to override the form month
      const rowMonth = parseMonthValue(row['Month']);
      const effectiveMonth = rowMonth ?? month;

      // Re-check duplicates with effective month
      if (effectiveMonth !== month) {
        const existingForMonth = await db.salarySlip.findFirst({
          where: { employeeId: emp.id, month: effectiveMonth, year },
          select: { id: true },
        });
        if (existingForMonth) {
          invalid.push({
            row: rowNum,
            message: `Duplicate: salary already exists for ${effectiveMonth}/${year}`,
            data: row,
          });
          continue;
        }
      } else {
        if (existingSet.has(emp.id)) {
          invalid.push({
            row: rowNum,
            message: `Duplicate: salary already exists for ${effectiveMonth}/${year}`,
            data: row,
          });
          continue;
        }
      }

      const parseNum = (val: unknown, name: string): { ok: true; value: number } | { ok: false; message: string } => {
        if (val === '' || val === null || val === undefined) return { ok: true, value: 0 };
        const num = Number(val);
        if (isNaN(num)) return { ok: false, message: `${name} must be a number, got "${val}"` };
        return { ok: true, value: num };
      };

      const parseOptionalNum = (val: unknown): number | null => {
        if (val === '' || val === null || val === undefined) return null;
        const num = Number(val);
        if (isNaN(num)) return null;
        return num;
      };

      // Only Employee Code and Net Salary are truly required
      const netResult = parseNum(row['Net Salary'], 'Net Salary');
      if (!netResult.ok) {
        invalid.push({ row: rowNum, message: netResult.message, data: row });
        continue;
      }

      const salaryResult = parseNum(row['Salary'], 'Salary');
      const grossResult = parseNum(row['Gross Salary'], 'Gross Salary');
      const totalDeductionResult = parseNum(row['Total Deduction'], 'Total Deduction');

      valid.push({
        row: rowNum,
        employeeCode,
        employeeId: emp.id,
        month: effectiveMonth,
        year,
        employeeName: String(row['Employee Name'] || '').trim(),
        workingDays: parseOptionalNum(row['Working Days']),
        presentDays: parseOptionalNum(row['Present Days']),
        leave: parseOptionalNum(row['Leave']),
        salary: salaryResult.ok ? salaryResult.value || null : null,
        basicSalary: parseOptionalNum(row['Basic Salary']),
        hra: parseOptionalNum(row['HRA']),
        da: parseOptionalNum(row['DA']),
        conveyance: parseOptionalNum(row['CON.AL']),
        specialAllow: parseOptionalNum(row['COMM']),
        otherEarning: parseOptionalNum(row['OTHER']),
        grossSalary: grossResult.ok ? grossResult.value || null : null,
        pf: parseOptionalNum(row['PF']),
        esi: parseOptionalNum(row['ESI']),
        professionalTax: parseOptionalNum(row['PT']),
        tds: parseOptionalNum(row['TDS']),
        advance: parseOptionalNum(row['Advance']),
        totalDeduction: totalDeductionResult.ok ? totalDeductionResult.value || 0 : 0,
        netSalary: netResult.value,
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