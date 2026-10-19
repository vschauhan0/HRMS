import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { calculateForm16Tax } from '@/lib/form16-builder';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const financialYear = searchParams.get('financialYear');

    if (!employeeId || !financialYear) {
      return NextResponse.json({ success: false, message: 'employeeId and financialYear are required' }, { status: 400 });
    }

    const parts = financialYear.split('-');
    if (parts.length !== 2) {
      return NextResponse.json({ success: false, message: 'Invalid financial year format' }, { status: 400 });
    }
    const startYear = parseInt(parts[0]);
    let endYear = parseInt(parts[1]);
    if (endYear < 100) {
      endYear = 2000 + endYear;
    }

    const emp = await db.employee.findUnique({
      where: { id: employeeId },
      include: { company: true, branch: true },
    });

    if (!emp) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
    }

    const slips = await db.salarySlip.findMany({
      where: {
        employeeId: emp.id,
        OR: [
          { year: startYear, month: { gte: 4 } },
          { year: endYear, month: { lte: 3 } },
        ],
      },
    });

    let q1Amount = 0, q1Tds = 0;
    let q2Amount = 0, q2Tds = 0;
    let q3Amount = 0, q3Tds = 0;
    let q4Amount = 0, q4Tds = 0;

    slips.forEach((slip) => {
      const m = slip.month;
      const yr = slip.year;
      const gross = slip.grossSalary || 0;
      const tdsVal = slip.tds || 0;

      if (yr === startYear) {
        if (m >= 4 && m <= 6) {
          q1Amount += gross;
          q1Tds += tdsVal;
        } else if (m >= 7 && m <= 9) {
          q2Amount += gross;
          q2Tds += tdsVal;
        } else if (m >= 10 && m <= 12) {
          q3Amount += gross;
          q3Tds += tdsVal;
        }
      } else if (yr === endYear) {
        if (m >= 1 && m <= 3) {
          q4Amount += gross;
          q4Tds += tdsVal;
        }
      }
    });

    const periodFrom = `01-Apr-${startYear}`;
    const periodTo = `31-Mar-${endYear}`;
    const assessmentYear = `${startYear + 1}-${String(endYear + 1).slice(2)}`;

    const totalGross = q1Amount + q2Amount + q3Amount + q4Amount;
    const totalTds = q1Tds + q2Tds + q3Tds + q4Tds;
    const taxCalculations = calculateForm16Tax(totalGross, totalTds);

    const defaultData = {
      employerName: emp.company.name,
      employerAddress: emp.company.address || '',
      employerPan: emp.company.pan || 'AAIFN3857A',
      employerTan: emp.company.tan || 'SRTN03025B',
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeePan: emp.pan || 'ABCDE1234F',
      employeeCode: emp.employeeCode,
      financialYear,
      assessmentYear,
      periodFrom,
      periodTo,
      quarters: {
        q1Amount, q1Tds,
        q2Amount, q2Tds,
        q3Amount, q3Tds,
        q4Amount, q4Tds,
        totalGross, totalTds,
      },
      verificationPlace: emp.city || 'SURAT',
      verificationDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
      verificationName: 'KETANBHAI SAVANI',
      verificationDesignation: 'DIRECTOR',
      taxCalculations,
    };

    return NextResponse.json({ success: true, data: defaultData });
  } catch (error: any) {
    console.error('Precalculate route error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
