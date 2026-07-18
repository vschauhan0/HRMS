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

    // Get branches for the company to map branch codes
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
      select: { employeeCode: true, email: true },
    });

    const existingCodes = new Set(existingEmployees.map((e) => e.employeeCode));
    const existingEmails = new Set(existingEmployees.map((e) => e.email.toLowerCase()));

    const newRecords: Record<string, unknown>[] = [];
    const updatedRecords: Record<string, unknown>[] = [];
    const invalidRecords: { row: number; errors: string[]; data: Record<string, unknown> }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (1-indexed, header is row 1)
      const errors: string[] = [];

      // Map column names (case-insensitive matching)
      const getVal = (possibleNames: string[]): string => {
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

      const employeeCode = getVal(['Employee Code', 'employee code', 'employeecode', 'EmployeeCode']);
      const firstName = getVal(['First Name', 'first name', 'firstname', 'FirstName']);
      const lastName = getVal(['Last Name', 'last name', 'lastname', 'LastName']);
      const email = getVal(['Email', 'email', 'Email Address', 'emailaddress']);
      const mobile = getVal(['Mobile', 'mobile', 'Phone', 'phone', 'Mobile Number', 'mobilenumber']);
      const joiningDate = getVal(['Joining Date', 'joining date', 'joiningdate', 'JoiningDate', 'Date of Joining']);
      const branchCode = getVal(['Branch Code', 'branch code', 'branchcode', 'BranchCode']);
      const pan = getVal(['PAN', 'Pan', 'Pan Number', 'PAN Number', 'pan number', 'pannumber']);
      const department = getVal(['Department', 'department']);
      const designation = getVal(['Designation', 'designation']);
      const address = getVal(['Address', 'address']);

      // Validate required fields
      if (!employeeCode) errors.push('Employee Code is required');
      if (!firstName) errors.push('First Name is required');
      if (!lastName) errors.push('Last Name is required');
      if (!email) errors.push('Email is required');
      if (!mobile) errors.push('Mobile is required');
      if (!joiningDate) errors.push('Joining Date is required');
      if (!branchCode) errors.push('Branch Code is required');

      // Validate email format
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Invalid email format');
      }

      // Validate branch exists in company
      const branch = company.branches.find(
        (b) => b.code.toLowerCase() === branchCode.toLowerCase()
      );
      if (branchCode && !branch) {
        errors.push(`Branch code '${branchCode}' not found in company`);
      }

      // Validate date
      let parsedDate: Date | null = null;
      if (joiningDate) {
        parsedDate = new Date(joiningDate);
        if (isNaN(parsedDate.getTime())) {
          errors.push('Invalid Joining Date format');
        }
      }

      if (errors.length > 0) {
        invalidRecords.push({
          row: rowNum,
          errors,
          data: { employeeCode, firstName, lastName, email, mobile, joiningDate, branchCode, pan, department, designation, address },
        });
        continue;
      }

      const record = {
        employeeCode,
        firstName,
        lastName,
        email: email.toLowerCase(),
        mobile,
        pan: pan || null,
        joiningDate: parsedDate!.toISOString(),
        branchId: branch!.id,
        department: department || null,
        designation: designation || null,
        address: address || null,
        companyId,
      };

      if (existingCodes.has(employeeCode)) {
        updatedRecords.push(record);
      } else {
        // Check email duplicate for new records
        if (existingEmails.has(email.toLowerCase())) {
          errors.push('Duplicate email already exists');
          invalidRecords.push({
            row: rowNum,
            errors,
            data: { employeeCode, firstName, lastName, email, mobile, joiningDate, branchCode, pan, department, designation, address },
          });
        } else {
          newRecords.push(record);
        }
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