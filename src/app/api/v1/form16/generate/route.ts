import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { buildForm16PDF } from '@/lib/form16-builder';
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

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { employeeId, financialYear } = body;

    if (!financialYear) {
      return NextResponse.json({ success: false, message: 'financialYear is required' }, { status: 400 });
    }

    // Parse financial year (e.g. "2024-25" -> 2024 and 2025)
    const parts = financialYear.split('-');
    if (parts.length !== 2) {
      return NextResponse.json({ success: false, message: 'Invalid financial year format (use YYYY-YY)' }, { status: 400 });
    }
    const startYear = parseInt(parts[0]);
    let endYear = parseInt(parts[1]);
    if (endYear < 100) {
      endYear = 2000 + endYear;
    }

    // Determine target companyId
    let companyId = user.adminProfile?.companyId;
    if (user.role === 'SUPER_ADMIN') {
      if (body.companyId) {
        companyId = body.companyId;
      } else if (employeeId && employeeId !== 'ALL') {
        const emp = await db.employee.findUnique({
          where: { id: employeeId },
          select: { companyId: true },
        });
        if (emp) {
          companyId = emp.companyId;
        }
      }
    }

    // Only non-Super-Admins require a company context
    if (user.role !== 'SUPER_ADMIN' && !companyId) {
      return NextResponse.json({ success: false, message: 'Company context required' }, { status: 400 });
    }

    // Find target employees
    const employeeWhere: any = {};
    if (companyId) {
      employeeWhere.companyId = companyId;
    }
    if (employeeId && employeeId !== 'ALL') {
      employeeWhere.id = employeeId;
    }

    const employees = await db.employee.findMany({
      where: employeeWhere,
      include: {
        company: true,
        branch: true,
      },
    });

    if (employees.length === 0) {
      return NextResponse.json({ success: false, message: 'No employees found' }, { status: 404 });
    }

    const uploadDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads', 'form16');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const results: { employeeCode: string; name: string; success: boolean; message?: string }[] = [];

    for (const emp of employees) {
      try {
        // Query salary slips for this financial year
        const slips = await db.salarySlip.findMany({
          where: {
            employeeId: emp.id,
            OR: [
              { year: startYear, month: { gte: 4 } }, // April to December
              { year: endYear, month: { lte: 3 } },   // January to March
            ],
          },
        });

        if (slips.length === 0) {
          results.push({
            employeeCode: emp.employeeCode,
            name: `${emp.firstName} ${emp.lastName}`,
            success: false,
            message: 'No salary slips found for this financial year',
          });
          continue;
        }

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

        const periodFrom = `01-Apr-${startYear}`;
        const periodTo = `31-Mar-${endYear}`;
        const assessmentYear = `${startYear + 1}-${String(endYear + 1).slice(2)}`;

        const form16Data = {
          employerName: body.customData?.employerName || emp.company.name,
          employerAddress: body.customData?.employerAddress || emp.company.address || '',
          employerPan: body.customData?.employerPan || emp.company.pan || 'AAIFN3857A',
          employerTan: body.customData?.employerTan || emp.company.tan || 'SRTN03025B',
          employeeName: body.customData?.employeeName || `${emp.firstName} ${emp.lastName}`,
          employeePan: body.customData?.employeePan || emp.pan || 'ABCDE1234F',
          employeeCode: body.customData?.employeeCode || emp.employeeCode,
          financialYear,
          assessmentYear: body.customData?.assessmentYear || assessmentYear,
          periodFrom: body.customData?.periodFrom || periodFrom,
          periodTo: body.customData?.periodTo || periodTo,
          quarters: {
            q1Amount: Number(body.customData?.quarters?.q1Amount ?? q1Amount),
            q1Tds: Number(body.customData?.quarters?.q1Tds ?? q1Tds),
            q2Amount: Number(body.customData?.quarters?.q2Amount ?? q2Amount),
            q2Tds: Number(body.customData?.quarters?.q2Tds ?? q2Tds),
            q3Amount: Number(body.customData?.quarters?.q3Amount ?? q3Amount),
            q3Tds: Number(body.customData?.quarters?.q3Tds ?? q3Tds),
            q4Amount: Number(body.customData?.quarters?.q4Amount ?? q4Amount),
            q4Tds: Number(body.customData?.quarters?.q4Tds ?? q4Tds),
          },
          verificationPlace: body.customData?.verificationPlace || emp.city || 'SURAT',
          verificationDate: body.customData?.verificationDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
          verificationName: body.customData?.verificationName || 'KETANBHAI SAVANI',
          verificationDesignation: body.customData?.verificationDesignation || 'DIRECTOR',
          taxOverrides: body.customData?.taxOverrides || undefined,
        };

        const pdfBuffer = await buildForm16PDF(form16Data);
        const fileName = `form16_${emp.id}_${financialYear}_${Date.now()}.pdf`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, pdfBuffer);

        // Upsert record
        await db.form16Document.upsert({
          where: {
            employeeId_financialYear: {
              employeeId: emp.id,
              financialYear,
            },
          },
          create: {
            employeeId: emp.id,
            financialYear,
            filePath: `uploads/form16/${fileName}`,
            uploadedBy: user.id,
          },
          update: {
            filePath: `uploads/form16/${fileName}`,
            uploadedBy: user.id,
          },
        });

        results.push({
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`,
          success: true,
        });
      } catch (err: any) {
        results.push({
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`,
          success: false,
          message: err.message || 'Failed to generate PDF',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    if (successCount === 0) {
      if (employees.length === 1) {
        const errorMsg = results[0].message || 'No salary slips found for this employee in the selected financial year';
        return NextResponse.json({ success: false, message: errorMsg }, { status: 400 });
      } else {
        return NextResponse.json({ success: false, message: 'No salary slips found for any employees in the selected financial year' }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Form 16 generation complete. Generated: ${successCount}/${results.length}`,
    });
  } catch (error: any) {
    console.error('Form16 generate endpoint error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
