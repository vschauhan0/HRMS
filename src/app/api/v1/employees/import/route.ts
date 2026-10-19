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

/**
 * Parse a date string in various formats:
 * dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, yyyy-mm-dd, dd MMM yyyy, etc.
 */
function parseFlexDate(raw: string): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;

  // Try ISO / yyyy-mm-dd first
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
    if (!isNaN(d.getTime())) return d;
  }

  // Try dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const d = new Date(+dmyMatch[3], +dmyMatch[2] - 1, +dmyMatch[1]);
    if (!isNaN(d.getTime())) return d;
  }

  // Try dd MMM yyyy (e.g. 15 Jan 2023)
  const monthNames = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  ];
  const mmmMatch = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (mmmMatch) {
    const mi = monthNames.indexOf(mmmMatch[2].toLowerCase().substring(0, 3));
    if (mi !== -1) {
      const d = new Date(+mmmMatch[3], mi, +mmmMatch[1]);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Fallback to native Date parser
  const fallback = new Date(s);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

// POST /api/v1/employees/import - Preview import from Excel
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No data found in the Excel file' },
        { status: 400 }
      );
    }

    const companyId = authUser.role === 'ADMIN'
      ? (authUser.adminProfile?.companyId ?? '')
      : (formData.get('companyId') as string | null);

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Company ID is required' }, { status: 400 });
    }

    const branchId = formData.get('branchId') as string | null;
    if (!branchId) {
      return NextResponse.json({ success: false, message: 'Branch is required' }, { status: 400 });
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      include: { branches: true },
    });

    if (!company) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
    }

    const branchValid = company.branches.some((b) => b.id === branchId);
    if (!branchValid) {
      return NextResponse.json({ success: false, message: 'Branch not found in this company' }, { status: 400 });
    }

    // Get all existing employee codes and user emails for duplicate check
    const existingEmployees = await db.employee.findMany({
      select: { employeeCode: true, email: true, id: true },
    });
    const existingCodes = new Map(existingEmployees.map((e) => [e.employeeCode, e.id]));
    const existingEmployeeEmails = new Map(existingEmployees.map((e) => [e.email.toLowerCase(), e.employeeCode]));

    const existingUsers = await db.user.findMany({
      select: { email: true, employeeId: true }
    });
    const existingUserEmails = new Map(existingUsers.map(u => [u.email.toLowerCase(), u.employeeId]));

    const newRecords: Record<string, unknown>[] = [];
    const updatedRecords: Record<string, unknown>[] = [];
    const invalidRecords: { row: number; errors: string[]; data: Record<string, unknown> }[] = [];
    const seenCodes = new Set<string>();
    const seenEmails = new Set<string>();

    const getVal = (row: Record<string, unknown>, possibleNames: string[]): string => {
      for (const name of possibleNames) {
        const key = Object.keys(row).find((k) => k.toLowerCase().trim() === name.toLowerCase());
        if (key && row[key] !== undefined && row[key] !== null) {
          const val = String(row[key]).trim();
          const valLower = val.toLowerCase();
          if (
            valLower !== '' &&
            valLower !== 'null' &&
            valLower !== 'undefined' &&
            valLower !== 'nan' &&
            valLower !== '-'
          ) {
            return val;
          }
        }
      }
      return '';
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const errors: string[] = [];

      const employeeCode = getVal(row, ['Code', 'code', 'Employee Code']);
      const employeeName = getVal(row, ['Employee Name', 'employee name', 'employeename', 'EmployeeName', 'Name', 'name']);
      const mobile = getVal(row, ['Mobile', 'mobile', 'Phone', 'phone', 'Mobile Number', 'Contact Number', 'Contact No']);
      const email = getVal(row, ['Email', 'email', 'E-mail', 'e-mail']);

      let firstName = '';
      let lastName = '';
      if (employeeName) {
        const parts = employeeName.split(/\s+/).filter(Boolean);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ');
      }

      if (!employeeCode) errors.push('Code is required');
      if (!employeeName) errors.push('Employee Name is required');
      if (!firstName) errors.push('Employee Name must have at least a first name');
      if (!mobile) errors.push('Phone number is required');
      if (!email) {
        errors.push('Email is required');
      } else if (!email.includes('@')) {
        errors.push('Invalid email format');
      }

      if (errors.length > 0) {
        invalidRecords.push({ row: rowNum, errors, data: { employeeCode, firstName, lastName, email, mobile, companyId, branchId } });
        continue;
      }

      // Duplicate code in the same file
      if (seenCodes.has(employeeCode)) {
        invalidRecords.push({ row: rowNum, errors: [`Duplicate code "${employeeCode}" appears multiple times in the file`], data: { employeeCode, firstName, lastName, email, mobile, companyId, branchId } });
        continue;
      }
      seenCodes.add(employeeCode);

      const finalEmail = email.toLowerCase().trim();

      // Duplicate email in the same file
      if (seenEmails.has(finalEmail)) {
        invalidRecords.push({ row: rowNum, errors: [`Duplicate email "${finalEmail}" appears multiple times in the file`], data: { employeeCode, firstName, lastName, email, mobile, companyId, branchId } });
        continue;
      }
      seenEmails.add(finalEmail);

      // Check against database
      const existingEmployeeCode = existingEmployeeEmails.get(finalEmail);
      if (existingEmployeeCode && existingEmployeeCode !== employeeCode) {
        invalidRecords.push({ row: rowNum, errors: [`Email "${finalEmail}" is already used by another employee (Code: ${existingEmployeeCode})`], data: { employeeCode, firstName, lastName, email, mobile, companyId, branchId } });
        continue;
      }

      const existingUserEmpId = existingUserEmails.get(finalEmail);
      if (existingUserEmpId && existingCodes.get(employeeCode) !== existingUserEmpId) {
        invalidRecords.push({ row: rowNum, errors: [`Email "${finalEmail}" is already registered to a user account`], data: { employeeCode, firstName, lastName, email, mobile, companyId, branchId } });
        continue;
      }

      if (existingCodes.has(employeeCode)) {
        invalidRecords.push({ row: rowNum, errors: [`Employee Code "${employeeCode}" already exists in the database`], data: { employeeCode, firstName, lastName, email, mobile, companyId, branchId } });
        continue;
      }

      const data: Record<string, unknown> = {
        employeeCode, firstName, lastName, email: finalEmail, mobile, companyId, branchId,
      };

      newRecords.push(data);
    }

    const valid = newRecords.map((r: any) => ({ ...r, _isNew: true }));
    const invalid = invalidRecords.map((r) => ({ row: r.row, message: r.errors.join('; '), data: r.data }));

    return NextResponse.json({
      success: true,
      data: { valid, invalid, totalRows: rows.length },
    });
  } catch (error) {
    console.error('Import preview error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}