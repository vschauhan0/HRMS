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
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No data found in the Excel file' },
        { status: 400 }
      );
    }

    // Determine companyId
    const companyId = authUser.role === 'ADMIN'
      ? (authUser.adminProfile?.companyId ?? '')
      : (formData.get('companyId') as string | null);

    if (!companyId) {
      return NextResponse.json(
        { success: false, message: 'Company ID is required' },
        { status: 400 }
      );
    }

    const company = await db.company.findUnique({
      where: { id: companyId },
      include: { branches: true },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company not found' },
        { status: 404 }
      );
    }

    // Get all existing employee codes for duplicate check
    const existingEmployees = await db.employee.findMany({
      where: { companyId },
      select: { employeeCode: true, email: true, id: true },
    });

    const existingCodes = new Set(existingEmployees.map((e) => e.employeeCode));
    const existingEmails = new Set(existingEmployees.map((e) => e.email.toLowerCase()));
    const existingCodeMap = new Map(existingEmployees.map((e) => [e.employeeCode, e.id]));

    const newRecords: Record<string, unknown>[] = [];
    const updatedRecords: Record<string, unknown>[] = [];
    const invalidRecords: { row: number; errors: string[]; data: Record<string, unknown> }[] = [];

    // Helper: case-insensitive column lookup
    const getVal = (row: Record<string, unknown>, possibleNames: string[]): string => {
      for (const name of possibleNames) {
        const key = Object.keys(row).find(
          (k) => k.toLowerCase().trim() === name.toLowerCase()
        );
        if (key && row[key] !== undefined && row[key] !== null) {
          return String(row[key]).trim();
        }
      }
      return '';
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (1-indexed, header is row 1)
      const errors: string[] = [];

      // ── Extract all columns from the template ──
      const employeeCode = getVal(row, ['Code', 'code', 'Employee Code']);
      const employeeName = getVal(row, ['Employee Name', 'employee name', 'employeename', 'EmployeeName', 'Name', 'name']);
      const gender = getVal(row, ['Gender', 'gender']);
      const pan = getVal(row, ['PAN', 'Pan', 'Pan Number', 'PAN Number', 'pan number']);
      const address = getVal(row, ['Address', 'address']);
      const city = getVal(row, ['City', 'city']);
      const pin = getVal(row, ['PIN', 'Pin', 'pin', 'PIN Code', 'Pin Code']);
      const district = getVal(row, ['District', 'district']);
      const state = getVal(row, ['State', 'state']);
      const mobile = getVal(row, ['Mobile', 'mobile', 'Phone', 'phone', 'Mobile Number', 'Contact Number', 'Contact No']);
      const pfNo = getVal(row, ['PF No', 'PF No.', 'PF Number', 'PF Number.', 'pf no', 'pf no.', 'pf number']);
      const esiNo = getVal(row, ['ESI No', 'ESI No.', 'ESI Number', 'ESI Number.', 'esi no', 'esi no.', 'esi number']);
      const bankName = getVal(row, ['Bank Name', 'bank name', 'bankname', 'Bank']);
      const ifsc = getVal(row, ['IFSC', 'Ifsc', 'ifsc', 'IFSC Code']);
      const accountNumber = getVal(row, ['A/c Number', 'Account Number', 'A/c No', 'A/c No.', 'Account No', 'Account No.', 'AC Number', 'ac number', 'account number']);
      const aadharNumber = getVal(row, ['Aadhar Number', 'aadhar number', 'Aadhar No', 'Aadhar No.', 'Aadhar', 'aadhar', 'Aadhaar Number', 'aadhaar number']);
      const branchName = getVal(row, ['Branch', 'branch', 'Branch Name', 'branch name']);
      const department = getVal(row, ['Department', 'department', 'Dept', 'dept']);
      const designation = getVal(row, ['Designation', 'designation', 'Desig', 'desig']);
      const joiningDateStr = getVal(row, ['Date of Joining', 'date of joining', 'dateofjoining', 'Joining Date', 'joining date', 'joiningdate', 'DOJ']);
      const dobStr = getVal(row, ['DOB', 'dob', 'Date of Birth', 'date of birth', 'dateofbirth']);
      const resignationDateStr = getVal(row, ['Resignation Date', 'resignation date', 'resignationdate']);

      // ── Split Employee Name into firstName and lastName ──
      let firstName = '';
      let lastName = '';
      if (employeeName) {
        const parts = employeeName.split(/\s+/).filter(Boolean);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ');
      }

      // ── Validate required fields ──
      if (!employeeCode) errors.push('Code is required');
      if (!employeeName) errors.push('Employee Name is required');
      if (!firstName) errors.push('Employee Name must have at least a first name');
      if (!joiningDateStr) errors.push('Date of Joining is required');

      // ── Parse dates ──
      const joiningDate = parseFlexDate(joiningDateStr);
      if (joiningDateStr && !joiningDate) {
        errors.push('Invalid Date of Joining format');
      }

      const dob = dobStr ? parseFlexDate(dobStr) : null;
      if (dobStr && !dob) {
        errors.push('Invalid DOB format');
      }

      const resignationDate = resignationDateStr ? parseFlexDate(resignationDateStr) : null;
      if (resignationDateStr && !resignationDate) {
        errors.push('Invalid Resignation Date format');
      }

      // ── Match branch by name or code ──
      let branchId: string | null = null;
      if (branchName) {
        const branch = company.branches.find(
          (b) =>
            b.name.toLowerCase() === branchName.toLowerCase() ||
            b.code.toLowerCase() === branchName.toLowerCase()
        );
        if (branch) {
          branchId = branch.id;
        } else {
          errors.push(`Branch '${branchName}' not found in company`);
        }
      }

      // ── Validate gender if provided ──
      if (gender && !['Male', 'Female', 'Other', 'MALE', 'FEMALE', 'OTHER'].includes(gender)) {
        errors.push('Gender must be Male, Female, or Other');
      }

      // ── Validate mobile if provided ──
      if (mobile && !/^\d{7,15}$/.test(mobile.replace(/[\s\-+()]/g, ''))) {
        errors.push('Invalid Mobile number');
      }

      // ── Validate bank details consistency ──
      const hasBankDetails = bankName || accountNumber || ifsc;
      if (hasBankDetails) {
        if (!bankName) errors.push('Bank Name is required when providing bank details');
        if (!accountNumber) errors.push('A/c Number is required when providing bank details');
        if (!ifsc) errors.push('IFSC is required when providing bank details');
      }

      // ── Auto-generate email ──
      const generatedEmail = `${firstName.toLowerCase()}.${employeeCode.toLowerCase()}@company.com`;

      // ── Build preview data object ──
      const data: Record<string, unknown> = {
        employeeCode,
        firstName,
        lastName,
        email: generatedEmail,
        gender: gender || null,
        pan: pan || null,
        address: address || null,
        city: city || null,
        pin: pin || null,
        district: district || null,
        state: state || null,
        mobile: mobile || null,
        pfNo: pfNo || null,
        esiNo: esiNo || null,
        aadharNumber: aadharNumber || null,
        department: department || null,
        designation: designation || null,
        joiningDate: joiningDate ? joiningDate.toISOString() : null,
        dob: dob ? dob.toISOString() : null,
        resignationDate: resignationDate ? resignationDate.toISOString() : null,
        branchId: branchId,
        companyId,
        bankDetail: hasBankDetails
          ? {
              bankName,
              accountNumber,
              ifsc,
              accountHolder: employeeName,
            }
          : null,
      };

      if (errors.length > 0) {
        invalidRecords.push({ row: rowNum, errors, data });
        continue;
      }

      // ── Classify as new or update ──
      if (existingCodes.has(employeeCode)) {
        updatedRecords.push(data);
      } else {
        // Check email duplicate for new records
        if (existingEmails.has(generatedEmail.toLowerCase())) {
          // For new records with auto-generated emails, this shouldn't normally happen
          // unless there's a code collision, but let's be safe
          const existingId = existingCodeMap.get(employeeCode);
          if (!existingId) {
            // Actually a duplicate email issue
            errors.push('Duplicate email already exists');
            invalidRecords.push({ row: rowNum, errors, data });
            continue;
          }
        }
        newRecords.push(data);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        newRecords,
        updatedRecords,
        invalidRecords,
        totalRows: rows.length,
      },
    });
  } catch (error) {
    console.error('Import preview error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}