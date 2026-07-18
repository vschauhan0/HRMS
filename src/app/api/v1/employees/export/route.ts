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

// GET /api/v1/employees/export - Export employees as Excel
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const branchId = searchParams.get('branchId') || '';

    const where: Record<string, unknown> = {};

    if (authUser.role === 'ADMIN') {
      where.companyId = authUser.adminProfile?.companyId || '';
    }

    if (status) {
      where.status = status;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    const employees = await db.employee.findMany({
      where,
      include: {
        company: true,
        branch: true,
        bankDetail: true,
      },
      orderBy: { employeeCode: 'asc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx');

    const exportData = employees.map((emp) => ({
      'Employee Code': emp.employeeCode,
      'First Name': emp.firstName,
      'Last Name': emp.lastName,
      'Email': emp.email,
      'Mobile': emp.mobile,
      'PAN': emp.pan || '',
      'Joining Date': new Date(emp.joiningDate).toLocaleDateString('en-IN'),
      'Department': emp.department || '',
      'Designation': emp.designation || '',
      'Branch': emp.branch?.name || '',
      'Company': emp.company?.name || '',
      'Status': emp.status,
      'Address': emp.address || '',
      'Bank Name': emp.bankDetail?.bankName || '',
      'Account Number': emp.bankDetail?.accountNumber || '',
      'IFSC': emp.bankDetail?.ifsc || '',
      'Account Holder': emp.bankDetail?.accountHolder || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Employee Code
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 30 }, // Email
      { wch: 15 }, // Mobile
      { wch: 12 }, // PAN
      { wch: 15 }, // Joining Date
      { wch: 20 }, // Department
      { wch: 20 }, // Designation
      { wch: 25 }, // Branch
      { wch: 30 }, // Company
      { wch: 12 }, // Status
      { wch: 40 }, // Address
      { wch: 20 }, // Bank Name
      { wch: 20 }, // Account Number
      { wch: 12 }, // IFSC
      { wch: 25 }, // Account Holder
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const fileName = `employees-export-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Export employees error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}