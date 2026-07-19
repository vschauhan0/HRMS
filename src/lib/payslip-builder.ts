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
  const centerY = leftMargin + pageWidth / 2;

  const monthName = getMonthName(data.month);
  const lastDay = getDaysInMonth(data.month, data.year);
  const mmStr = String(data.month).padStart(2, '0');

  // ----- 1. HEADER: Company Name -----
  doc.font('Helvetica-Bold').fontSize(18);
  doc.text(data.companyName, 0, 30, { width: doc.page.width, align: 'center' });

  // ----- 2. Company Address -----
  let y = doc.y + 4;
  if (data.companyAddress) {
    doc.font('Helvetica').fontSize(9);
    doc.text(data.companyAddress, 0, y, { width: doc.page.width, align: 'center' });
    y = doc.y + 2;
  }

  // ----- 3. Title -----
  y += 6;
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text(`Pay Slip For the Month of ${monthName}-${data.year}`, 0, y, {
    width: doc.page.width,
    align: 'center',
  });
  y = doc.y + 2;

  // ----- 4. Period -----
  doc.font('Helvetica').fontSize(9);
  doc.text(`(From 01/${mmStr}/${data.year} To ${lastDay}/${mmStr}/${data.year})`, 0, y, {
    width: doc.page.width,
    align: 'center',
  });
  y = doc.y + 8;

  // ----- Helper: Draw bordered box -----
  function drawBox(
    x: number,
    boxY: number,
    w: number,
    h: number,
    content: (innerX: number, innerY: number) => void
  ) {
    doc.rect(x, boxY, w, h).stroke('#333');
    content(x + 6, boxY + 6);
  }

  // ----- 5. Employee Info Box -----
  const infoBoxHeight = 72;
  const colWidth = pageWidth / 2 - 4;

  const infoItems: Array<{ label: string; value: string }> = [
    { label: 'Employee Name', value: data.employeeName },
    { label: 'Employee Code', value: data.employeeCode },
    { label: 'Bank A/c No.', value: data.bankAccountNumber || '-' },
    { label: 'Bank Name', value: data.bankName || '-' },
    { label: 'UAN', value: data.uan || '-' },
    { label: 'Mobile', value: data.mobile },
  ];

  const infoRightItems: Array<{ label: string; value: string }> = [
    { label: 'Designation', value: data.designation || '-' },
    { label: 'Unit', value: data.branchName },
  ];

  const infoRowHeight = 10;
  const infoStartY = y;

  // Draw left column box
  drawBox(leftMargin, infoStartY, colWidth, infoBoxHeight, (ix, iy) => {
    doc.font('Helvetica').fontSize(8.5);
    let rowY = iy;
    for (const item of infoItems) {
      doc.font('Helvetica-Bold').fontSize(8.5).text(item.label, ix, rowY, { continued: true, width: colWidth - 16 });
      doc.font('Helvetica').text(`: ${item.value}`, { width: colWidth - 16 });
      rowY += infoRowHeight;
    }
  });

  // Draw right column box
  drawBox(leftMargin + colWidth + 8, infoStartY, colWidth, infoBoxHeight, (ix, iy) => {
    doc.font('Helvetica').fontSize(8.5);
    let rowY = iy;
    for (const item of infoRightItems) {
      doc.font('Helvetica-Bold').fontSize(8.5).text(item.label, ix, rowY, { continued: true, width: colWidth - 16 });
      doc.font('Helvetica').text(`: ${item.value}`, { width: colWidth - 16 });
      rowY += infoRowHeight;
    }
  });

  y = infoStartY + infoBoxHeight + 6;

  // ----- 6. Attendance Box -----
  const attBoxHeight = 26;
  const attColWidth = pageWidth / 3;

  drawBox(leftMargin, y, pageWidth, attBoxHeight, (ix, iy) => {
    doc.font('Helvetica').fontSize(8.5);
    const attItems = [
      { label: 'Total Paid Days', value: String(data.totalPaidDays) },
      { label: 'LWP', value: String(data.lwp) },
      { label: 'Net Paid Days', value: String(data.netPaidDays) },
    ];
    let ax = ix;
    for (const item of attItems) {
      doc.font('Helvetica-Bold').fontSize(8.5).text(item.label + ': ', ax, iy + 4, { continued: true });
      doc.font('Helvetica').text(item.value);
      ax += attColWidth;
    }
  });

  y += attBoxHeight + 6;

  // ----- 7. Earnings & Deductions Table -----
  const tableWidth = pageWidth;
  const halfTableWidth = tableWidth / 2 - 2;
  const tableRowHeight = 18;
  const tableHeaderHeight = 20;
  const scaleColWidth = halfTableWidth * 0.35;
  const amountColWidth = halfTableWidth * 0.45;
  const labelColWidth = halfTableWidth * 0.2;

  // Reusable: draw a table section (Earnings or Deductions)
  function drawTableSection(
    startX: number,
    startY: number,
    title: string,
    rows: Array<{ label: string; scale: number; amount: number; isTotal?: boolean }>
  ) {
    const tw = halfTableWidth;

    // Title row
    doc.rect(startX, startY, tw, tableHeaderHeight).fillAndStroke('#e5e5e5', '#333');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
    doc.text(title, startX, startY + 5, { width: tw, align: 'center' });

    let ry = startY + tableHeaderHeight;

    // Header row
    doc.rect(startX, ry, tw, tableRowHeight).stroke('#333');
    // Divider lines
    doc.moveTo(startX + scaleColWidth, ry).lineTo(startX + scaleColWidth, ry + tableRowHeight).stroke('#333');
    doc.moveTo(startX + scaleColWidth + amountColWidth, ry).lineTo(startX + scaleColWidth + amountColWidth, ry + tableRowHeight).stroke('#333');

    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('Particulars', startX + 4, ry + 5, { width: scaleColWidth - 8, align: 'left' });
    doc.text('Scale Rs.', startX + scaleColWidth + 4, ry + 5, { width: amountColWidth - 8, align: 'right' });
    doc.text('Amount Rs.', startX + scaleColWidth + amountColWidth + 4, ry + 5, { width: labelColWidth - 8, align: 'right' });

    ry += tableRowHeight;

    // Data rows
    for (const row of rows) {
      if (row.isTotal) {
        doc.rect(startX, ry, tw, tableRowHeight).fillAndStroke('#f0f0f0', '#333');
      } else {
        doc.rect(startX, ry, tw, tableRowHeight).stroke('#333');
      }

      // Divider lines
      doc.moveTo(startX + scaleColWidth, ry).lineTo(startX + scaleColWidth, ry + tableRowHeight).stroke('#333');
      doc.moveTo(startX + scaleColWidth + amountColWidth, ry).lineTo(startX + scaleColWidth + amountColWidth, ry + tableRowHeight).stroke('#333');

      const fontName = row.isTotal ? 'Helvetica-Bold' : 'Helvetica';
      const fontSize = row.isTotal ? 8.5 : 8;

      doc.font(fontName).fontSize(fontSize);
      doc.text(row.label, startX + 4, ry + 5, { width: scaleColWidth - 8, align: 'left' });
      doc.text(formatAmount(row.scale), startX + scaleColWidth + 4, ry + 5, { width: amountColWidth - 8, align: 'right' });
      doc.text(formatAmount(row.amount), startX + scaleColWidth + amountColWidth + 4, ry + 5, { width: labelColWidth - 8, align: 'right' });

      ry += tableRowHeight;
    }

    return ry;
  }

  const earningsRows = [
    { label: 'BASIC', scale: data.basicScale, amount: data.basicAmount },
    { label: 'DAILY ALLOWANCE (DA)', scale: data.daScale, amount: data.daAmount },
    { label: 'HRA', scale: data.hraScale, amount: data.hraAmount },
    { label: 'Conv.A', scale: data.conveyanceScale, amount: data.conveyanceAmount },
    { label: 'Edu.A', scale: data.medicalScale, amount: data.medicalAmount },
    { label: 'Med.A', scale: 0, amount: 0 },
    { label: 'Prod. Ince.', scale: data.specialAllowScale, amount: data.specialAllowAmount },
    { label: 'Total Earnings', scale: data.totalEarnings, amount: data.totalEarnings, isTotal: true },
  ];

  const deductionsRows = [
    { label: 'PROFESSIONAL TAX', scale: 0, amount: data.professionalTax },
    { label: 'PF', scale: 0, amount: data.pf },
    { label: 'ESI AMOUNT', scale: 0, amount: data.esi },
    { label: 'TDS', scale: 0, amount: data.tds },
    { label: 'LWF', scale: 0, amount: data.lwf },
    { label: 'ADVANCE', scale: 0, amount: data.advance },
    { label: '', scale: 0, amount: data.otherDeduction },
    { label: 'Total Deductions', scale: data.totalDeductions, amount: data.totalDeductions, isTotal: true },
  ];

  const earningsEndY = drawTableSection(leftMargin, y, 'EARNINGS', earningsRows);
  const deductionsEndY = drawTableSection(leftMargin + halfTableWidth + 4, y, 'DEDUCTIONS', deductionsRows);

  y = Math.max(earningsEndY, deductionsEndY) + 6;

  // ----- 8. Net Pay Section -----
  const netBoxHeight = 32;
  drawBox(leftMargin, y, pageWidth, netBoxHeight, (ix, iy) => {
    // Net Pay amount
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Net Pay:', ix, iy + 2, { continued: true });
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`  Rs. ${formatAmount(data.netPay)}`);

    // In words
    doc.font('Helvetica').fontSize(8);
    doc.text(`In Words: Rs. ${numberToWords(data.netPay)}`, ix, iy + 16);
  });

  y += netBoxHeight + 4;

  // ----- 9. Misc Section -----
  const miscBoxHeight = 22;
  drawBox(leftMargin, y, pageWidth, miscBoxHeight, (ix, iy) => {
    doc.font('Helvetica').fontSize(8.5);
    doc.text(`SALARY: ${formatAmount(data.salary)}`, ix, iy + 3, { continued: true, width: pageWidth - 16 });

    if (data.cumulativeTds != null) {
      const tdsText = `TDS Deducted Upto ${monthName}-${data.year}: Rs. ${formatAmount(data.cumulativeTds)}`;
      doc.text('    ' + tdsText);
    }
  });

  y += miscBoxHeight + 10;

  // ----- 10. Footer -----
  doc.font('Helvetica').fontSize(7);
  doc.text('This is Computer Generated Sheet, does not require Signature.', leftMargin, y, {
    width: pageWidth * 0.6,
    align: 'left',
  });
  doc.font('Helvetica-Bold').fontSize(8);
  doc.text(data.companyName, 0, y, {
    width: doc.page.width,
    align: 'right',
    indent: 40,
  });

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
  const dir = path.join(process.cwd(), 'uploads', 'payslips');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}