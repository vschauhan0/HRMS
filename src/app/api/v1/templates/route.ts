import { NextRequest, NextResponse } from 'next/server';

const XLSX = require('xlsx');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'employee';

    const wb = XLSX.utils.book_new();

    if (type === 'employee') {
      const data = [['Code', 'Employee Name', 'Mobile', 'Email']];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    } else if (type === 'salary') {
      const headers = [
        'Employee Code', 'Employee Name', 'Working Days', 'Present Days', 'Leave',
        'Salary', 'Basic Salary', 'HRA', 'DA', 'CON.AL', 'COMM', 'OTHER',
        'Gross Salary', 'PF', 'ESI', 'PT', 'TDS', 'Advance',
        'Total Deduction', 'Net Salary',
      ];
      const data = [headers];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = headers.map(() => ({ wch: 16 }));
      XLSX.utils.book_append_sheet(wb, ws, 'Salary');
    } else {
      return NextResponse.json({ success: false, message: 'Invalid template type' }, { status: 400 });
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${type}-template.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
