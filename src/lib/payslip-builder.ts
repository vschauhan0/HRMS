import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

// ==================== NUMBER TO WORDS (Indian Currency) ====================

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function convertTwoDigit(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return TENS[ten] + (one ? ' ' + ONES[one] : '');
}

function convertThreeDigit(n: number): string {
  if (n >= 1000 || n < 0) return '';
  if (n === 0) return '';
  if (n < 100) return convertTwoDigit(n);
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  return ONES[hundred] + ' Hundred' + (remainder ? ' and ' + convertTwoDigit(remainder) : '');
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const isNegative = num < 0;
  if (isNegative) num = -num;

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);

  const paise = Math.round((num - Math.floor(num)) * 100);

  let result = '';

  if (crore > 0) result += convertTwoDigit(crore) + ' Crore ';
  if (lakh > 0) result += convertTwoDigit(lakh) + ' Lakh ';
  if (thousand > 0) result += convertTwoDigit(thousand) + ' Thousand ';
  if (remainder > 0) result += convertThreeDigit(remainder);

  result = result.trim();
  if (!result) result = 'Zero';

  result += ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertTwoDigit(paise) + ' Paise';
  }

  result += ' Only';

  if (isNegative) result = 'Minus ' + result;

  return result;
}

// ==================== MONTHS ====================

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthName(month: number): string {
  return MONTH_NAMES[month] || '';
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

// ==================== FORMATTING ====================

function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return '0.00';
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ==================== TYPES ====================

interface PayslipData {
  companyName: string;
  companyAddress?: string | null;
  employeeName: string;
  employeeCode: string;
  designation?: string | null;
  branchName: string;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  uan?: string | null;
  mobile: string;
  month: number;
  year: number;
  totalPaidDays: number;
  lwp: number;
  netPaidDays: number;
  // Earnings
  basicScale: number;
  basicAmount: number;
  daScale: number;
  daAmount: number;
  hraScale: number;
  hraAmount: number;
  conveyanceScale: number;
  conveyanceAmount: number;
  medicalScale: number;
  medicalAmount: number;
  specialAllowScale: number;
  specialAllowAmount: number;
  otherEarningScale: number;
  otherEarningAmount: number;
  totalEarnings: number;
  // Deductions
  professionalTax: number;
  pf: number;
  esi: number;
  tds: number;
  lwf: number;
  advance: number;
  otherDeduction: number;
  totalDeductions: number;
  // Net
  netPay: number;
  // Misc
  salary: number;
  cumulativeTds?: number | null;
}

// ==================== PDF BUILDER ====================

export function buildPayslipPDF(data: PayslipData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 30, bottom: 30, left: 40, right: 40 },
      bufferPages: true,
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftMargin = doc.page.margins.left;
    const rightMargin = doc.page.width - doc.page.margins.right;

    const monthName = getMonthName(data.month);
    const lastDay = getDaysInMonth(data.month, data.year);
    const mmStr = String(data.month).padStart(2, '0');

    // Outer border start coordinate
    const outerStartY = 30;

    // ----- 1. Logo -----
    let logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const isNidhi = data.companyName.toLowerCase().includes('nidhi');
    if (isNidhi) {
      logoPath = path.join(process.cwd(), 'public', 'nidhi_impex_logo.png');
    } else {
      logoPath = path.join(process.cwd(), 'public', 'silver_star_logo.png');
    }

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, leftMargin + 10, 38, { width: 68, height: 68 });
    }

    // ----- 2. HEADER TEXT -----
    const headerTextX = leftMargin + 85;
    const headerTextWidth = pageWidth - 170;

    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000');
    doc.text(data.companyName.toUpperCase(), headerTextX, 36, { width: headerTextWidth, align: 'center' });

    let y = doc.y + 3;
    if (data.companyAddress) {
      doc.font('Helvetica-Bold').fontSize(8.5);
      doc.text(data.companyAddress.toUpperCase(), headerTextX, y, { width: headerTextWidth, align: 'center' });
      y = doc.y + 4;
    }

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(`Pay Slip For the Month of ${monthName}-${data.year}`, headerTextX, y, {
      width: headerTextWidth,
      align: 'center',
    });
    y = doc.y + 2;

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text(`(From 01/${mmStr}/${data.year} To ${lastDay}/${mmStr}/${data.year})`, headerTextX, y, {
      width: headerTextWidth,
      align: 'center',
    });
    y = doc.y + 12;

    // Header divider line
    doc.moveTo(leftMargin, y).lineTo(rightMargin, y).lineWidth(1.5).stroke('#000000');
    y += 12;

    // ----- 3. Employee Info Box -----
    const infoStartY = y;
    doc.rect(leftMargin, infoStartY, pageWidth, 56 + 28).lineWidth(1).stroke('#000000');

    // Details rows
    doc.font('Helvetica').fontSize(8.5);
    // Row 1
    doc.font('Helvetica').text('Employee Name', leftMargin + 6, infoStartY + 4);
    doc.font('Helvetica-Bold').text(`: ${data.employeeName}`, leftMargin + 96, infoStartY + 4);
    doc.font('Helvetica').text('Employee Code', leftMargin + 260, infoStartY + 4);
    doc.font('Helvetica-Bold').text(`: ${data.employeeCode}`, leftMargin + 350, infoStartY + 4);

    // Row 2
    doc.font('Helvetica').text('Bank A/c No.', leftMargin + 6, infoStartY + 18);
    doc.font('Helvetica-Bold').text(`: ${data.bankAccountNumber || '-'}`, leftMargin + 96, infoStartY + 18);
    doc.font('Helvetica').text('Bank Name', leftMargin + 260, infoStartY + 18);
    doc.font('Helvetica-Bold').text(`: ${data.bankName || '-'}`, leftMargin + 350, infoStartY + 18);

    // Row 3
    doc.font('Helvetica').text('UAN', leftMargin + 6, infoStartY + 32);
    doc.font('Helvetica-Bold').text(`: ${data.uan || '-'}`, leftMargin + 96, infoStartY + 32);
    doc.font('Helvetica').text('Mobile', leftMargin + 260, infoStartY + 32);
    doc.font('Helvetica-Bold').text(`: ${data.mobile || '-'}`, leftMargin + 350, infoStartY + 32);

    // Row 4
    doc.font('Helvetica').text('Designation', leftMargin + 6, infoStartY + 46);
    doc.font('Helvetica-Bold').text(`: ${data.designation || '-'}`, leftMargin + 96, infoStartY + 46, { width: 160 });
    doc.font('Helvetica').text('Unit', leftMargin + 260, infoStartY + 46);
    doc.font('Helvetica-Bold').text(`: ${data.branchName || '-'}`, leftMargin + 350, infoStartY + 46, { width: 160 });

    // Attendance Divider
    doc.moveTo(leftMargin, infoStartY + 58).lineTo(rightMargin, infoStartY + 58).stroke('#000000');
    // Vertical split
    doc.moveTo(leftMargin + pageWidth / 2, infoStartY + 58).lineTo(leftMargin + pageWidth / 2, infoStartY + 84).stroke('#000000');

    // Attendance Info
    doc.font('Helvetica-Bold').fontSize(8.5);
    doc.text('Total Paid Days', leftMargin + 6, infoStartY + 62);
    doc.text(`: ${data.totalPaidDays}`, leftMargin + 220, infoStartY + 62);

    doc.text('LWP', leftMargin + pageWidth / 2 + 6, infoStartY + 62);
    doc.text(`: ${data.lwp}`, leftMargin + pageWidth / 2 + 220, infoStartY + 62);

    doc.text('Net Paid Days', leftMargin + 6, infoStartY + 73);
    doc.text(`: ${data.netPaidDays}`, leftMargin + 220, infoStartY + 73);

    y = infoStartY + 84 + 12;

    // ----- 4. Earnings & Deductions Table -----
    const tableStartY = y;
    const tableHeight = 20 + 112 + 20;
    doc.rect(leftMargin, tableStartY, pageWidth, tableHeight).stroke('#000000');

    // Vertical dividers
    doc.moveTo(leftMargin + 127.64, tableStartY).lineTo(leftMargin + 127.64, tableStartY + tableHeight).stroke('#000000');
    doc.moveTo(leftMargin + 192.64, tableStartY).lineTo(leftMargin + 192.64, tableStartY + tableHeight).stroke('#000000');
    doc.moveTo(leftMargin + 257.64, tableStartY).lineTo(leftMargin + 257.64, tableStartY + tableHeight).stroke('#000000');
    doc.moveTo(leftMargin + 385.28, tableStartY).lineTo(leftMargin + 385.28, tableStartY + tableHeight).stroke('#000000');
    doc.moveTo(leftMargin + 450.28, tableStartY).lineTo(leftMargin + 450.28, tableStartY + tableHeight).stroke('#000000');

    // Horizontal lines
    doc.moveTo(leftMargin, tableStartY + 20).lineTo(rightMargin, tableStartY + 20).stroke('#000000');
    for (let i = 1; i <= 7; i++) {
      const rowLineY = tableStartY + 20 + i * 16;
      doc.moveTo(leftMargin, rowLineY).lineTo(rightMargin, rowLineY).stroke('#000000');
    }

    // Headers text
    doc.font('Helvetica-Bold').fontSize(8.5);
    doc.text('Earnings', leftMargin + 4, tableStartY + 6);
    doc.text('Scale Rs.', leftMargin + 127.64 + 4, tableStartY + 6, { width: 61, align: 'right' });
    doc.text('Amount Rs.', leftMargin + 192.64 + 4, tableStartY + 6, { width: 61, align: 'right' });
    
    doc.text('Deductions', leftMargin + 257.64 + 4, tableStartY + 6);
    doc.text('Scale Rs.', leftMargin + 385.28 + 4, tableStartY + 6, { width: 61, align: 'right' });
    doc.text('Amount Rs.', leftMargin + 450.28 + 4, tableStartY + 6, { width: 61, align: 'right' });

    // Data rows
    const rows = [
      { eLab: 'BASIC', eScale: data.basicScale, eAmt: data.basicAmount, dLab: 'PROFESSIONAL TAX', dScale: 0, dAmt: data.professionalTax },
      { eLab: 'DAILY ALLOWANCE', eScale: data.daScale, eAmt: data.daAmount, dLab: 'PF', dScale: 0, dAmt: data.pf },
      { eLab: 'HRA', eScale: data.hraScale, eAmt: data.hraAmount, dLab: 'ESI AMOUNT', dScale: 0, dAmt: data.esi },
      { eLab: 'Conv.A', eScale: data.conveyanceScale, eAmt: data.conveyanceAmount, dLab: 'TDS', dScale: 0, dAmt: data.tds },
      { eLab: 'Edu.A', eScale: data.medicalScale, eAmt: data.medicalAmount, dLab: 'LWF', dScale: 0, dAmt: data.lwf },
      { eLab: 'Med.A', eScale: 0, eAmt: 0, dLab: 'ADVANCE', dScale: 0, dAmt: data.advance },
      { eLab: 'Prod. Ince.', eScale: data.specialAllowScale, eAmt: data.specialAllowAmount, dLab: '', dScale: 0, dAmt: data.otherDeduction },
    ];

    doc.font('Helvetica').fontSize(8);
    let currentY = tableStartY + 20;
    for (const row of rows) {
      // Earnings
      doc.text(row.eLab, leftMargin + 4, currentY + 4);
      doc.text(formatAmount(row.eScale), leftMargin + 127.64 + 4, currentY + 4, { width: 61, align: 'right' });
      doc.text(formatAmount(row.eAmt), leftMargin + 192.64 + 4, currentY + 4, { width: 61, align: 'right' });

      // Deductions
      if (row.dLab) {
        doc.text(row.dLab, leftMargin + 257.64 + 4, currentY + 4);
        doc.text(formatAmount(row.dScale), leftMargin + 385.28 + 4, currentY + 4, { width: 61, align: 'right' });
        doc.text(formatAmount(row.dAmt), leftMargin + 450.28 + 4, currentY + 4, { width: 61, align: 'right' });
      } else if (row.dAmt > 0) {
        doc.text(formatAmount(row.dAmt), leftMargin + 450.28 + 4, currentY + 4, { width: 61, align: 'right' });
      }
      currentY += 16;
    }

    // Totals row
    doc.font('Helvetica-Bold').fontSize(8.5);
    doc.text('Total Earnings', leftMargin + 4, currentY + 5);
    doc.text(formatAmount(data.totalEarnings), leftMargin + 127.64 + 4, currentY + 5, { width: 61, align: 'right' });
    doc.text(formatAmount(data.totalEarnings), leftMargin + 192.64 + 4, currentY + 5, { width: 61, align: 'right' });

    doc.text('Total Deductions', leftMargin + 257.64 + 4, currentY + 5);
    doc.text(formatAmount(data.totalDeductions), leftMargin + 385.28 + 4, currentY + 5, { width: 61, align: 'right' });
    doc.text(formatAmount(data.totalDeductions), leftMargin + 450.28 + 4, currentY + 5, { width: 61, align: 'right' });

    y = tableStartY + tableHeight;

    // ----- 5. Net Pay Section -----
    const netStartY = y + 12;
    doc.rect(leftMargin, netStartY, pageWidth, 32).stroke('#000000');
    doc.rect(leftMargin + 0.5, netStartY + 0.5, pageWidth - 1, 15).fill('#f9f9f9');
    doc.moveTo(leftMargin, netStartY + 16).lineTo(rightMargin, netStartY + 16).stroke('#000000');

    // Net Pay Text
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
    doc.text('Net Pay', leftMargin + 6, netStartY + 4);
    doc.text(`: Rs. ${formatAmount(data.netPay)}`, leftMargin + 60, netStartY + 4);

    // In Words Text
    doc.font('Helvetica-Bold').text('In Words', leftMargin + 6, netStartY + 20);
    doc.font('Helvetica').text(`: Rs. ${numberToWords(data.netPay)}`, leftMargin + 60, netStartY + 20);

    // ----- 6. Miscellaneous Information -----
    const miscStartY = netStartY + 32 + 12;
    const miscHeight = 120;
    doc.rect(leftMargin, miscStartY, pageWidth, miscHeight).stroke('#000000');

    // Title
    doc.rect(leftMargin + 0.5, miscStartY + 0.5, pageWidth - 1, 19).fill('#f9f9f9');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
    doc.text('Miscellaneous Information', leftMargin + 6, miscStartY + 6);
    doc.moveTo(leftMargin, miscStartY + 20).lineTo(rightMargin, miscStartY + 20).stroke('#000000');

    // Salary row
    const salaryY = miscStartY + 20;
    doc.font('Helvetica').fontSize(8.5);
    doc.text('SALARY', leftMargin + 6, salaryY + 5);
    doc.moveTo(rightMargin - 120, salaryY).lineTo(rightMargin - 120, salaryY + 18).stroke('#000000');
    doc.font('Helvetica-Bold').text(formatAmount(data.salary || data.totalEarnings), rightMargin - 114, salaryY + 5, { width: 110, align: 'right' });
    doc.moveTo(leftMargin, salaryY + 18).lineTo(rightMargin, salaryY + 18).stroke('#000000');

    // Content area
    const contentY = salaryY + 18;
    doc.font('Helvetica-Oblique').fontSize(8);
    const tdsText = data.tds ? `Rs. ${formatAmount(data.tds)}` : 'Nil';
    doc.text(`TDS Deducted Upto ${monthName}-${data.year}: Rs. ${tdsText}`, leftMargin + 6, contentY + 10);
    
    doc.font('Helvetica-Bold').fontSize(8.5);
    doc.text('This is Computer Generated Sheet, does not require Signature.', leftMargin + 6, contentY + 26);

    // Paid On & Company Footer
    const footerY = miscStartY + miscHeight - 16;
    doc.font('Helvetica').fontSize(8.5).fillColor('#666666');
    doc.text('Paid On: -', leftMargin + 6, footerY);

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
    doc.text(data.companyName.toUpperCase(), rightMargin - 206, footerY, { width: 200, align: 'right' });

    // ----- 7. Draw Outer border around everything -----
    const finalY = miscStartY + miscHeight;
    doc.rect(leftMargin, outerStartY, pageWidth, finalY - outerStartY).lineWidth(1.5).stroke('#000000');

    doc.end();
  });
}

// ==================== SLIP DATA MAPPER ====================

interface SalarySlipRow {
  id: string;
  month: number;
  year: number;
  grossSalary: number;
  totalDeduction: number;
  netSalary: number;
  salary: number | null;
  basicSalary: number | null;
  hra: number | null;
  da: number | null;
  conveyance: number | null;
  medical: number | null;
  specialAllow: number | null;
  otherEarning: number | null;
  pf: number | null;
  esi: number | null;
  tds: number | null;
  professionalTax: number | null;
  lwf: number | null;
  advance: number | null;
  otherDeduction: number | null;
  workingDays: number | null;
  presentDays: number | null;
  leave: number | null;
  lwp: number | null;
  employee: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    mobile: string;
    designation: string | null;
    uan: string | null;
    company: {
      name: string;
      address: string | null;
    };
    branch: {
      name: string;
    };
    bankDetail: {
      bankName: string;
      accountNumber: string;
    } | null;
  };
  batch: {
    companyId: string;
  };
}

export function mapSlipToPayslipData(
  slip: SalarySlipRow,
  cumulativeTds?: number | null
): PayslipData {
  const emp = slip.employee;
  const totalEarnings = slip.grossSalary;
  const totalDeductions = slip.totalDeduction;
  const netPay = slip.netSalary;
  const lwp = slip.lwp || 0;
  const totalPaidDays = slip.workingDays || 30;
  const netPaidDays = totalPaidDays - lwp;

  return {
    companyName: emp.company.name,
    companyAddress: emp.company.address,
    employeeName: `${emp.firstName} ${emp.lastName}`,
    employeeCode: emp.employeeCode,
    designation: emp.designation,
    branchName: emp.branch.name,
    bankAccountNumber: emp.bankDetail?.accountNumber,
    bankName: emp.bankDetail?.bankName,
    uan: emp.uan,
    mobile: emp.mobile,
    month: slip.month,
    year: slip.year,
    totalPaidDays,
    lwp,
    netPaidDays,
    basicScale: slip.basicSalary || 0,
    basicAmount: slip.basicSalary || 0,
    daScale: slip.da || 0,
    daAmount: slip.da || 0,
    hraScale: slip.hra || 0,
    hraAmount: slip.hra || 0,
    conveyanceScale: slip.conveyance || 0,
    conveyanceAmount: slip.conveyance || 0,
    medicalScale: slip.medical || 0,
    medicalAmount: slip.medical || 0,
    specialAllowScale: slip.specialAllow || 0,
    specialAllowAmount: slip.specialAllow || 0,
    otherEarningScale: slip.otherEarning || 0,
    otherEarningAmount: slip.otherEarning || 0,
    totalEarnings,
    professionalTax: slip.professionalTax || 0,
    pf: slip.pf || 0,
    esi: slip.esi || 0,
    tds: slip.tds || 0,
    lwf: slip.lwf || 0,
    advance: slip.advance || 0,
    otherDeduction: slip.otherDeduction || 0,
    totalDeductions,
    netPay,
    salary: slip.salary || 0,
    cumulativeTds: cumulativeTds ?? null,
  };
}

export function getSaveDir(): string {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'payslips');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}