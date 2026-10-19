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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the Form 16 Document metadata
    const doc = await db.form16Document.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            company: true,
            branch: true,
          },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ success: false, message: 'Form 16 document not found' }, { status: 404 });
    }

    // Verify company access
    if (user.role === 'ADMIN' && user.adminProfile?.companyId !== doc.employee.companyId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    } else if (user.role === 'EMPLOYEE' && user.employeeId !== doc.employeeId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const financialYear = doc.financialYear;
    const parts = financialYear.split('-');
    const startYear = parseInt(parts[0]);
    let endYear = parseInt(parts[1]);
    if (endYear < 100) {
      endYear = 2000 + endYear;
    }

    // Query salary slips for this financial year to run dynamic calculations
    const slips = await db.salarySlip.findMany({
      where: {
        employeeId: doc.employeeId,
        OR: [
          { year: startYear, month: { gte: 4 } }, // April to December
          { year: endYear, month: { lte: 3 } },   // January to March
        ],
      },
    });

    // Aggregate quarters
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

    const totalGross = q1Amount + q2Amount + q3Amount + q4Amount;
    const totalTds = q1Tds + q2Tds + q3Tds + q4Tds;
    const taxRes = calculateForm16Tax(totalGross, totalTds);

    const assessmentYear = `${startYear + 1}-${String(endYear + 1).slice(2)}`;
    const periodFrom = `01-Apr-${startYear}`;
    const periodTo = `31-Mar-${endYear}`;

    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        financialYear,
        assessmentYear,
        periodFrom,
        periodTo,
        employerName: doc.employee.company.name,
        employerAddress: doc.employee.company.address || '',
        employerPan: doc.employee.company.pan || 'AAIFN3857A',
        employerTan: doc.employee.company.tan || 'SRTN03025B',
        employeeName: `${doc.employee.firstName} ${doc.employee.lastName}`,
        employeePan: doc.employee.pan || 'ABCDE1234F',
        employeeCode: doc.employee.employeeCode,
        designation: doc.employee.designation || 'Employee',
        branchName: doc.employee.branch?.name || '',
        quarters: {
          q1Amount, q1Tds,
          q2Amount, q2Tds,
          q3Amount, q3Tds,
          q4Amount, q4Tds,
          totalGross, totalTds,
        },
        taxCalculations: taxRes,
        verificationPlace: doc.employee.city || 'SURAT',
        verificationDate: new Date(doc.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
        verificationName: 'KETANBHAI SAVANI',
        verificationDesignation: 'DIRECTOR',
      },
    });
  } catch (error: any) {
    console.error('Form16 details view endpoint error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
