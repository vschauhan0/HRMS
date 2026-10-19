import PDFDocument from 'pdfkit';
import { numberToWords } from './utils';

export interface Form16Data {
  employerName: string;
  employerAddress: string;
  employerPan: string;
  employerTan: string;
  employeeName: string;
  employeePan: string;
  employeeCode: string;
  financialYear: string; // e.g. "2024-25"
  assessmentYear: string; // e.g. "2025-26"
  periodFrom: string; // e.g. "01-Apr-2024"
  periodTo: string; // e.g. "31-Mar-2025"
  quarters: {
    q1Amount: number;
    q1Tds: number;
    q2Amount: number;
    q2Tds: number;
    q3Amount: number;
    q3Tds: number;
    q4Amount: number;
    q4Tds: number;
  };
  verificationPlace: string;
  verificationDate: string;
  verificationName: string;
  verificationDesignation: string;
  taxOverrides?: {
    grossSalary?: number;
    standardDeduction?: number;
    chargeableSalary?: number;
    grossTotalIncome?: number;
    totalDeductionVIA?: number;
    taxableIncome?: number;
    taxOnTotalIncome?: number;
    rebate87A?: number;
    surcharge?: number;
    cess?: number;
    taxPayable?: number;
    taxDeducted?: number;
    netTaxPayableOrRefund?: number;
  };
}

export function calculateForm16Tax(grossSalary: number, totalTds: number) {
  const standardDeduction = 75000;
  const chargeableSalary = Math.max(0, grossSalary - standardDeduction);
  const grossTotalIncome = chargeableSalary;
  const totalDeductionVIA = 0; // Disallowed in 115BAC New Tax Regime
  const taxableIncome = grossTotalIncome;

  let taxOnTotalIncome = 0;
  if (taxableIncome > 300000) {
    if (taxableIncome <= 600000) {
      taxOnTotalIncome = (taxableIncome - 300000) * 0.05;
    } else if (taxableIncome <= 900000) {
      taxOnTotalIncome = 15000 + (taxableIncome - 600000) * 0.10;
    } else if (taxableIncome <= 1200000) {
      taxOnTotalIncome = 45000 + (taxableIncome - 900000) * 0.15;
    } else if (taxableIncome <= 1500000) {
      taxOnTotalIncome = 90000 + (taxableIncome - 1200000) * 0.20;
    } else {
      taxOnTotalIncome = 150000 + (taxableIncome - 1500000) * 0.30;
    }
  }

  // Rebate u/s 87A
  let rebate87A = 0;
  if (taxableIncome <= 700000) {
    rebate87A = taxOnTotalIncome;
  }

  const taxAfterRebate = Math.max(0, taxOnTotalIncome - rebate87A);
  const surcharge = 0;
  const cess = taxAfterRebate > 0 ? Math.round(taxAfterRebate * 0.04) : 0;
  const taxPayable = taxAfterRebate + cess;
  const netTaxPayableOrRefund = taxPayable - totalTds;

  return {
    grossSalary,
    standardDeduction,
    chargeableSalary,
    grossTotalIncome,
    totalDeductionVIA,
    taxableIncome,
    taxOnTotalIncome,
    rebate87A,
    surcharge,
    cess,
    taxPayable,
    taxDeducted: totalTds,
    netTaxPayableOrRefund,
  };
}

export function buildForm16PDF(data: Form16Data): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const totalGross = data.quarters.q1Amount + data.quarters.q2Amount + data.quarters.q3Amount + data.quarters.q4Amount;
    const totalTds = data.quarters.q1Tds + data.quarters.q2Tds + data.quarters.q3Tds + data.quarters.q4Tds;
    const defaultTaxRes = calculateForm16Tax(totalGross, totalTds);
    const taxRes = {
      ...defaultTaxRes,
      ...data.taxOverrides,
    };

    const leftMargin = 30;
    const pageWidth = 535; // A4 width 595 - 60 margins
    const rightMargin = leftMargin + pageWidth;

    const formatAmount = (num: number) => {
      if (num === 0) return 'Nil';
      return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    };

    // ==========================================
    // PAGE 1: PART A (Page 1 of 1)
    // ==========================================
    drawPageTitle('PART A');
    drawPartACertificate();
    drawEmployerEmployeeDetailsTable();
    drawQuarterlyBreakdownTable();
    drawBookAdjustmentTable();
    drawChallanTable();
    drawVerificationSection(taxRes.taxPayable);
    drawFooter('Page 1 of 1');

    // ==========================================
    // PAGE 2: PART B (Page 1 of 3)
    // ==========================================
    doc.addPage();
    drawPageTitle('PART B (Annexure-I)', 'Details of Salary paid and any other income and tax deducted');
    drawEmployerEmployeeMiniHeader();
    drawPartBPage1Table();
    drawFooter('Page 1 of 3');

    // ==========================================
    // PAGE 3: PART B (Page 2 of 3)
    // ==========================================
    doc.addPage();
    drawPageTitle('PART B (Annexure-I)', 'Details of Salary paid and any other income and tax deducted (Contd.)');
    drawEmployerEmployeeMiniHeader();
    drawPartBPage2Table();
    drawFooter('Page 2 of 3');

    // ==========================================
    // PAGE 4: PART B (Page 3 of 3)
    // ==========================================
    doc.addPage();
    drawPageTitle('PART B (Annexure-I)', 'Tax Deducted Summary');
    drawEmployerEmployeeMiniHeader();
    drawPartBPage3Table();
    drawFooter('Page 3 of 3');

    doc.end();

    // ==========================================
    // DRAW METHODS
    // ==========================================

    function drawPageTitle(mainTitle: string, subTitle?: string) {
      doc.fillColor('#000000');
      doc.font('Helvetica-Bold').fontSize(14).text('FORM NO. 16', { align: 'center' });
      doc.font('Helvetica').fontSize(8).text('[See rule 31(1)(a)]', { align: 'center' });
      doc.font('Helvetica-Bold').fontSize(10.5).text(mainTitle, { align: 'center' });
      if (subTitle) {
        doc.font('Helvetica').fontSize(8.5).text(subTitle, { align: 'center' });
      }
      doc.moveDown(0.3);
    }

    function drawPartACertificate() {
      doc.font('Helvetica-Bold').fontSize(8.5).text(
        'Certificate under section 203 of the Income-tax Act, 1961 for Tax deducted at source on Salary',
        { align: 'center' }
      );
      doc.moveDown(0.4);

      const topY = doc.y;
      doc.rect(leftMargin, topY, pageWidth, 20).stroke();
      doc.font('Helvetica-Bold').fontSize(8).text('Certificate No.', leftMargin + 8, topY + 6);
      doc.font('Helvetica').text('___________________', leftMargin + 105, topY + 6);

      doc.font('Helvetica-Bold').text('Last updated on', leftMargin + 270, topY + 6);
      doc.font('Helvetica').text('__ / __ / ____', leftMargin + 375, topY + 6);
      doc.moveDown(1.0);
    }

    function drawEmployerEmployeeDetailsTable() {
      const topY = doc.y;
      const rowHeight1 = 70;
      const rowHeight2 = 18;

      // Outer Box
      doc.rect(leftMargin, topY, pageWidth, rowHeight1 + rowHeight2 * 5).stroke();

      // Divider line down the middle
      const colX = leftMargin + 267.5;
      doc.moveTo(colX, topY).lineTo(colX, topY + rowHeight1 + rowHeight2 * 5).stroke();

      // Row dividers
      doc.moveTo(leftMargin, topY + rowHeight1).lineTo(rightMargin, topY + rowHeight1).stroke();
      for (let i = 1; i <= 5; i++) {
        doc.moveTo(leftMargin, topY + rowHeight1 + rowHeight2 * i).lineTo(rightMargin, topY + rowHeight1 + rowHeight2 * i).stroke();
      }

      // Column headers
      doc.font('Helvetica-Bold').fontSize(7.5).text('Name and address of the Employer', leftMargin + 6, topY + 6);
      doc.text('Name and address of the Employee', colX + 6, topY + 6);

      // Employer details
      doc.font('Helvetica-Bold').fontSize(8).text(data.employerName, leftMargin + 6, topY + 16, { width: 250 });
      doc.font('Helvetica').fontSize(7).text(data.employerAddress, leftMargin + 6, topY + 25, { width: 250, lineGap: 1.2 });

      // Employee details
      doc.font('Helvetica-Bold').fontSize(8).text(data.employeeName, colX + 6, topY + 16, { width: 250 });

      // PAN / TAN Row 1
      let y = topY + rowHeight1;
      doc.font('Helvetica-Bold').fontSize(7.5).text('PAN of the Deductor', leftMargin + 6, y + 5);
      doc.font('Helvetica').text(data.employerPan, leftMargin + 130, y + 5);

      doc.font('Helvetica-Bold').text('TAN of the Deductor', colX + 6, y + 5);
      doc.font('Helvetica').text(data.employerTan, colX + 130, y + 5);

      // PAN Row 2
      y += rowHeight2;
      doc.font('Helvetica-Bold').text('PAN of the Employee', leftMargin + 6, y + 5);
      doc.font('Helvetica').text(data.employeePan, leftMargin + 130, y + 5);

      doc.font('Helvetica-Bold').text('Employee Reference No. provided by the Employer (If available)', colX + 6, y + 5);
      doc.font('Helvetica').text(data.employeeCode ? data.employeeCode : '-', colX + 270, y + 5);

      // CIT (TDS) Row 3
      y += rowHeight2;
      doc.font('Helvetica-Bold').text('CIT (TDS)', leftMargin + 6, y + 5);
      doc.font('Helvetica-Bold').text('Assessment Year', colX + 6, y + 5);
      doc.font('Helvetica').text(data.assessmentYear, colX + 130, y + 5);

      // Period Row 4
      y += rowHeight2;
      doc.font('Helvetica').text('The Commissioner of Income Tax (TDS) -', leftMargin + 6, y + 5);
      doc.font('Helvetica-Bold').text('Period with the Employer', colX + 6, y + 5);

      // Dates Row 5
      y += rowHeight2;
      doc.font('Helvetica').text('-', leftMargin + 6, y + 5);
      doc.font('Helvetica').text(`From ${data.periodFrom} To ${data.periodTo}`, colX + 6, y + 5);

      doc.y = y + rowHeight2 + 10;
    }

    function drawQuarterlyBreakdownTable() {
      const topY = doc.y;
      doc.font('Helvetica-Bold').fontSize(8).text(
        'Summary of amount paid/credited and tax deducted at source thereon in respect of the employee',
        leftMargin, topY
      );

      const tableTopY = topY + 12;
      const rowHeight = 24;
      const colWidths = [50, 220, 90, 90, 85];

      // Draw table borders
      doc.rect(leftMargin, tableTopY, pageWidth, rowHeight * 6).stroke();
      doc.moveTo(leftMargin, tableTopY + rowHeight).lineTo(rightMargin, tableTopY + rowHeight).stroke();
      doc.moveTo(leftMargin, tableTopY + rowHeight * 5).lineTo(rightMargin, tableTopY + rowHeight * 5).stroke();

      let xAccum = leftMargin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        xAccum += colWidths[i];
        doc.moveTo(xAccum, tableTopY).lineTo(xAccum, tableTopY + rowHeight * 6).stroke();
      }

      // Headers (using smaller fonts & precise positioning to prevent overlaps)
      doc.font('Helvetica-Bold').fontSize(6.8);
      doc.text('Quarter(s)', leftMargin + 4, tableTopY + 8);
      doc.text('Receipt Numbers of original statements of TDS under sub-section (3) of section 200', leftMargin + 54, tableTopY + 5, { width: 212, lineGap: 1.5 });
      doc.text('Amount\npaid/credited', leftMargin + 274, tableTopY + 5, { width: 82, align: 'right' });
      doc.text('Amount of tax deducted\n(Rs.)', leftMargin + 364, tableTopY + 5, { width: 82, align: 'right' });
      doc.text('Amount of tax deposited/remitted\n(Rs.)', leftMargin + 454, tableTopY + 5, { width: 77, align: 'right' });

      // Rows Data
      const quartersData = [
        { name: 'Q1', amt: data.quarters.q1Amount, tds: data.quarters.q1Tds },
        { name: 'Q2', amt: data.quarters.q2Amount, tds: data.quarters.q2Tds },
        { name: 'Q3', amt: data.quarters.q3Amount, tds: data.quarters.q3Tds },
        { name: 'Q4', amt: data.quarters.q4Amount, tds: data.quarters.q4Tds },
      ];

      doc.font('Helvetica').fontSize(7.5);
      quartersData.forEach((q, idx) => {
        const rowY = tableTopY + rowHeight * (idx + 1);
        doc.text(q.name, leftMargin + 4, rowY + 8);
        doc.text('-', leftMargin + 54, rowY + 8);
        doc.text(formatAmount(q.amt), leftMargin + 274, rowY + 8, { width: 82, align: 'right' });
        doc.text(formatAmount(q.tds), leftMargin + 364, rowY + 8, { width: 82, align: 'right' });
        doc.text(formatAmount(q.tds), leftMargin + 454, rowY + 8, { width: 77, align: 'right' });
      });

      // Total Row
      const totalY = tableTopY + rowHeight * 5;
      doc.font('Helvetica-Bold');
      doc.text('Total (Rs.)', leftMargin + 4, totalY + 8);
      doc.text(formatAmount(totalGross), leftMargin + 274, totalY + 8, { width: 82, align: 'right' });
      doc.text(formatAmount(totalTds), leftMargin + 364, totalY + 8, { width: 82, align: 'right' });
      doc.text(formatAmount(totalTds), leftMargin + 454, totalY + 8, { width: 77, align: 'right' });

      doc.y = tableTopY + rowHeight * 6 + 10;
    }

    function drawBookAdjustmentTable() {
      const topY = doc.y;
      doc.font('Helvetica-Bold').fontSize(7.5).text(
        'I. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH BOOK ADJUSTMENT',
        leftMargin, topY
      );
      doc.font('Helvetica-Oblique').fontSize(7).text(
        '(The Deductor to provide payment wise details of tax deducted and deposited with respect to the deductee)',
        leftMargin, topY + 9
      );

      const tableTopY = topY + 18;
      const rowHeight = 22;
      const colWidths = [25, 110, 90, 110, 95, 105];

      // Draw table borders
      doc.rect(leftMargin, tableTopY, pageWidth, rowHeight * 2).stroke();
      doc.moveTo(leftMargin, tableTopY + rowHeight).lineTo(rightMargin, tableTopY + rowHeight).stroke();

      let xAccum = leftMargin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        xAccum += colWidths[i];
        doc.moveTo(xAccum, tableTopY).lineTo(xAccum, tableTopY + rowHeight * 2).stroke();
      }

      // Row 1 header cells
      doc.font('Helvetica-Bold').fontSize(6.5);
      doc.text('S. No.', leftMargin + 2, tableTopY + 7);
      doc.text('Tax Deposited in respect of the Deductee (Rs.)', leftMargin + 27, tableTopY + 4, { width: 105 });
      doc.text('Book identification number (BIN)', leftMargin + 137, tableTopY + 7, { width: 390, align: 'center' });

      // Total Row
      const labelY = tableTopY + rowHeight;
      doc.font('Helvetica').fontSize(7.5);
      doc.text('Total (Rs.)', leftMargin + 2, labelY + 7);
      doc.text('Nil', leftMargin + 137, labelY + 7);

      doc.y = tableTopY + rowHeight * 2 + 10;
    }

    function drawChallanTable() {
      const topY = doc.y;
      doc.font('Helvetica-Bold').fontSize(7.5).text(
        'II. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH CHALLAN',
        leftMargin, topY
      );
      doc.font('Helvetica-Oblique').fontSize(7).text(
        '(The Deductor to provide payment wise details of tax deducted and deposited with respect to the deductee)',
        leftMargin, topY + 9
      );

      const tableTopY = topY + 18;
      const rowHeight = 22;
      const colWidths = [25, 110, 90, 95, 95, 120];

      // Draw table borders
      doc.rect(leftMargin, tableTopY, pageWidth, rowHeight * 2).stroke();
      doc.moveTo(leftMargin, tableTopY + rowHeight).lineTo(rightMargin, tableTopY + rowHeight).stroke();

      let xAccum = leftMargin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        xAccum += colWidths[i];
        doc.moveTo(xAccum, tableTopY).lineTo(xAccum, tableTopY + rowHeight * 2).stroke();
      }

      // Headers
      doc.font('Helvetica-Bold').fontSize(6.5);
      doc.text('S. No.', leftMargin + 2, tableTopY + 7);
      doc.text('Tax Deposited in respect of the Deductee (Rs.)', leftMargin + 27, tableTopY + 4, { width: 105 });
      doc.text('Book identification number (BIN)', leftMargin + 137, tableTopY + 7, { width: 390, align: 'center' });

      // Total Row
      const labelY = tableTopY + rowHeight;
      doc.font('Helvetica').fontSize(7.5);
      doc.text('Total (Rs.)', leftMargin + 2, labelY + 7);
      doc.text('Nil', leftMargin + 137, labelY + 7);

      doc.y = tableTopY + rowHeight * 2 + 15;
    }

    function drawVerificationSection(taxPayable: number) {
      const topY = doc.y;
      doc.font('Helvetica-Bold').fontSize(8.5).text('Verification', leftMargin, topY);
      doc.moveDown(0.4);

      const textInWords = taxPayable > 0 ? numberToWords(taxPayable) : 'Nil';
      const textAmt = taxPayable > 0 ? `Rs. ${formatAmount(taxPayable)}` : 'Rs. Nil';

      doc.font('Helvetica').fontSize(8).text(
        `I, ${data.verificationName}, son/daughter of working in the capacity of ${data.verificationDesignation} do hereby certify that a sum of ${textAmt} [${textInWords} (in words)] has been deducted and deposited to the credit of the Central Government.`,
        leftMargin, doc.y, { width: pageWidth, lineGap: 3 }
      );
      doc.moveDown(0.5);
      doc.text(
        'I further certify that the information given above is true, complete and correct and is based on the book of accounts, documents, TDS statements, TDS deposited and other available records.',
        leftMargin, doc.y, { width: pageWidth, lineGap: 3 }
      );

      doc.moveDown(1.2);
      const signY = doc.y;
      doc.font('Helvetica-Bold');
      doc.text(`Place : ${data.verificationPlace}`, leftMargin, signY);
      doc.text(`Date : ${data.verificationDate}`, leftMargin, signY + 12);

      doc.text('(Signature of person responsible for deduction of tax)', leftMargin + 250, signY, { align: 'right', width: 285 });
      doc.text(`Full Name: ${data.verificationName}`, leftMargin + 250, signY + 24, { align: 'right', width: 285 });
      doc.text(`Designation: ${data.verificationDesignation}`, leftMargin, signY + 24);
    }

    function drawEmployerEmployeeMiniHeader() {
      const topY = doc.y;
      doc.rect(leftMargin, topY, pageWidth, 28).stroke();
      doc.moveTo(leftMargin + 133, topY).lineTo(leftMargin + 133, topY + 28).stroke();
      doc.moveTo(leftMargin + 266, topY).lineTo(leftMargin + 266, topY + 28).stroke();
      doc.moveTo(leftMargin + 399, topY).lineTo(leftMargin + 399, topY + 28).stroke();

      doc.font('Helvetica-Bold').fontSize(7);
      doc.text('TAN of Employer', leftMargin + 5, topY + 4);
      doc.font('Helvetica').fontSize(8).text(data.employerTan, leftMargin + 5, topY + 14);

      doc.font('Helvetica-Bold').fontSize(7).text('Name of Employee', leftMargin + 138, topY + 4);
      doc.font('Helvetica').fontSize(8).text(data.employeeName, leftMargin + 138, topY + 14, { width: 120 });

      doc.font('Helvetica-Bold').fontSize(7).text('PAN of Employee', leftMargin + 271, topY + 4);
      doc.font('Helvetica').fontSize(8).text(data.employeePan, leftMargin + 271, topY + 14);

      doc.font('Helvetica-Bold').fontSize(7).text('Assessment Year', leftMargin + 404, topY + 4);
      doc.font('Helvetica').fontSize(8).text(data.assessmentYear, leftMargin + 404, topY + 14);

      doc.y = topY + 36;
    }

    function drawPartBPage1Table() {
      const topY = doc.y;
      doc.font('Helvetica-Bold').fontSize(8.5).text(
        'Whether opting out of taxation u/s 115BAC(1A)?   NO',
        leftMargin, topY
      );

      const tableTopY = topY + 14;
      const colWidths = [35, 330, 40, 130];
      const rowHeight = 16;

      doc.rect(leftMargin, tableTopY, pageWidth, rowHeight * 22).stroke();

      let xAccum = leftMargin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        xAccum += colWidths[i];
        doc.moveTo(xAccum, tableTopY).lineTo(xAccum, tableTopY + rowHeight * 22).stroke();
      }

      doc.font('Helvetica-Bold').fontSize(7.5);
      doc.text('Ref', leftMargin + 4, tableTopY + 4);
      doc.text('Particulars', leftMargin + 39, tableTopY + 4);
      doc.text('Rs.', leftMargin + 369, tableTopY + 4);
      doc.text('Amount', leftMargin + 409, tableTopY + 4);
      doc.moveTo(leftMargin, tableTopY + rowHeight).lineTo(rightMargin, tableTopY + rowHeight).stroke();

      const rows = [
        { ref: '1.(a)', part: 'Salary as per provisions contained in section 17(1)', amt: formatAmount(taxRes.grossSalary) },
        { ref: '1.(b)', part: 'Value of perquisites under section 17(2) (as per Form No. 12BA, wherever applicable)', amt: 'Nil' },
        { ref: '1.(c)', part: 'Profits in lieu of salary under section 17(3) (as per Form No. 12BA, wherever applicable)', amt: 'Nil' },
        { ref: '1.(d)', part: 'Total', amt: formatAmount(taxRes.grossSalary), bold: true },
        { ref: '1.(e)', part: 'Reported total amount of salary received from other employer(s)', amt: 'Nil' },
        { ref: '2.(a)', part: 'Travel concession or assistance under section 10(5)', amt: 'Nil' },
        { ref: '2.(b)', part: 'Death-cum-retirement gratuity under section 10(10)', amt: 'Nil' },
        { ref: '2.(c)', part: 'Commuted value of pension under section 10(10A)', amt: 'Nil' },
        { ref: '2.(d)', part: 'Cash equivalent of leave salary encashment under section 10(10AA)', amt: 'Nil' },
        { ref: '2.(e)', part: 'House rent allowance under section 10(13A)', amt: 'Nil' },
        { ref: '2.(f)', part: 'Other special allowances under section 10(14)', amt: 'Nil' },
        { ref: '2.(g)', part: 'Amount of any other exemption under section 10', amt: 'Nil' },
        { ref: '2.(h)', part: 'Total amount of any other exemption under section 10', amt: 'Nil' },
        { ref: '2.(i)', part: 'Total amount of exemption claimed under section 10 [2(a)+2(b)+2(c)+2(d)+2(e)+2(f)+2(h)]', amt: 'Nil' },
        { ref: '3.', part: 'Total amount of salary received from current employer [1(d)-2(i)]', amt: formatAmount(taxRes.grossSalary), bold: true },
        { ref: '4.(a)', part: 'Standard deduction under section 16(ia)', amt: formatAmount(taxRes.standardDeduction) },
        { ref: '4.(b)', part: 'Entertainment allowance under section 16(ii)', amt: 'Nil' },
        { ref: '4.(c)', part: 'Tax on employment under section 16(iii)', amt: 'Nil' },
        { ref: '5.', part: 'Total amount of deductions under section 16 [4(a)+4(b)+4(c)]', amt: formatAmount(taxRes.standardDeduction), bold: true },
        { ref: '6.', part: 'Income chargeable under the head "Salaries" [3+1(e)-5]', amt: formatAmount(taxRes.chargeableSalary), bold: true },
        { ref: '9.', part: 'Gross total income (6+8)', amt: formatAmount(taxRes.grossTotalIncome), bold: true },
      ];

      rows.forEach((r, idx) => {
        const rowY = tableTopY + rowHeight * (idx + 1);
        doc.moveTo(leftMargin, rowY).lineTo(rightMargin, rowY).stroke();

        doc.font(r.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.3);
        doc.text(r.ref, leftMargin + 4, rowY + 4);
        doc.text(r.part, leftMargin + 39, rowY + 4, { width: 320 });
        doc.text(r.bold ? '' : 'Rs.', leftMargin + 369, rowY + 4);
        doc.text(r.amt, leftMargin + 409, rowY + 4, { width: 120, align: 'right' });
      });

      doc.y = tableTopY + rowHeight * 22 + 10;

      // VIA Section Table
      const viaTopY = doc.y;
      doc.rect(leftMargin, viaTopY, pageWidth, rowHeight * 5).stroke();
      doc.moveTo(leftMargin, viaTopY + rowHeight).lineTo(rightMargin, viaTopY + rowHeight).stroke();

      doc.moveTo(leftMargin + 35, viaTopY).lineTo(leftMargin + 35, viaTopY + rowHeight * 5).stroke();
      doc.moveTo(leftMargin + 330, viaTopY).lineTo(leftMargin + 330, viaTopY + rowHeight * 5).stroke();
      doc.moveTo(leftMargin + 430, viaTopY).lineTo(leftMargin + 430, viaTopY + rowHeight * 5).stroke();

      doc.font('Helvetica-Bold').fontSize(7.5);
      doc.text('Ref', leftMargin + 4, viaTopY + 4);
      doc.text('Deductions under Chapter VI-A', leftMargin + 39, viaTopY + 4);
      doc.text('Gross Amount', leftMargin + 335, viaTopY + 4);
      doc.text('Deductible Amount', leftMargin + 435, viaTopY + 4);

      const viaRows = [
        { ref: '10.(a)', part: 'Deduction in respect of life insurance premia, contributions to provident fund etc. u/s 80C', gross: 'Rs. Nil', ded: 'Rs. Nil' },
        { ref: '10.(b)', part: 'Deduction in respect of contribution to certain pension funds under section 80CCC', gross: 'Rs. Nil', ded: 'Rs. Nil' },
        { ref: '10.(c)', part: 'Deduction in respect of contribution by taxpayer to pension scheme under section 80CCD (1)', gross: 'Rs. Nil', ded: 'Rs. Nil' },
        { ref: '10.(d)', part: 'Total deduction under section 80C, 80CCC and 80CCD(1)', gross: 'Rs. Nil', ded: 'Rs. Nil', bold: true },
      ];

      viaRows.forEach((r, idx) => {
        const rowY = viaTopY + rowHeight * (idx + 1);
        doc.moveTo(leftMargin, rowY).lineTo(rightMargin, rowY).stroke();

        doc.font(r.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.3);
        doc.text(r.ref, leftMargin + 4, rowY + 4);
        doc.text(r.part, leftMargin + 39, rowY + 4, { width: 285 });
        doc.text(r.gross, leftMargin + 335, rowY + 4);
        doc.text(r.ded, leftMargin + 435, rowY + 4, { width: 95, align: 'right' });
      });

      doc.y = viaTopY + rowHeight * 5 + 10;
    }

    // PART B PAGE 2 TABLE (Chapter VI-A 10.e to Ref 16)
    function drawPartBPage2Table() {
      const startY = doc.y;
      const rowHeight = 24; // Increased cell height to 24 to handle line wrapping
      const colWidths = [35, 330, 40, 130];

      // Draw outer boundary
      doc.rect(leftMargin, startY, pageWidth, rowHeight * 17).stroke();

      let xAccum = leftMargin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        xAccum += colWidths[i];
        doc.moveTo(xAccum, startY).lineTo(xAccum, startY + rowHeight * 17).stroke();
      }

      // Table Header row
      doc.font('Helvetica-Bold').fontSize(7.5);
      doc.text('Ref', leftMargin + 4, startY + 8);
      doc.text('Deductions under Chapter VI-A & Tax Computation', leftMargin + 39, startY + 8);
      doc.text('Rs.', leftMargin + 369, startY + 8);
      doc.text('Amount', leftMargin + 409, startY + 8);
      doc.moveTo(leftMargin, startY + rowHeight).lineTo(rightMargin, startY + rowHeight).stroke();

      const compRows = [
        { ref: '10.(e)', part: 'Deductions in respect of amount paid/deposited to notified pension scheme under section 80CCD (1B)' },
        { ref: '10.(f)', part: 'Deduction in respect of contribution by Employer to pension scheme under section 80CCD (2)' },
        { ref: '10.(g)', part: 'Deduction in respect of health insurance premia under section 80D' },
        { ref: '10.(h)', part: 'Deduction in respect of interest on loan taken for higher education under section 80E' },
        { ref: '10.(i)', part: 'Deduction in respect of contribution by the employee to Agnipath Scheme under section 80CCH' },
        { ref: '10.(j)', part: 'Deduction in respect of contribution by the Central Government to Agnipath Scheme under section 80CCH' },
        { ref: '10.(k)', part: 'Total Deduction in respect of donations to certain funds, charitable institutions, etc. under section 80G' },
        { ref: '10.(l)', part: 'Deduction in respect of interest on deposits in savings account under section 80TTA' },
        { ref: '10.(m)', part: 'Amount deductible under any other provision(s) of Chapter VI-A' },
        { ref: '10.(n)', part: 'Total of amount deductible under any other provision(s) of Chapter VI-A' },
        { ref: '11.', part: 'Aggregate of deductible amount under Chapter VI-A', amt: 'Nil', bold: true },
        { ref: '12.', part: 'Total taxable income (9-11)', amt: formatAmount(taxRes.taxableIncome), bold: true },
        { ref: '13.', part: 'Tax on total income', amt: formatAmount(taxRes.taxOnTotalIncome) },
        { ref: '14.', part: 'Rebate under section 87A, if applicable', amt: formatAmount(taxRes.rebate87A) },
        { ref: '15.', part: 'Surcharge, wherever applicable', amt: 'Nil' },
        { ref: '16.', part: 'Health and education cess @ 4%', amt: formatAmount(taxRes.cess) },
      ];

      compRows.forEach((r, idx) => {
        const rowY = startY + rowHeight * (idx + 1);
        doc.moveTo(leftMargin, rowY).lineTo(rightMargin, rowY).stroke();

        doc.font(r.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.3);
        doc.text(r.ref, leftMargin + 4, rowY + 8);
        doc.text(r.part, leftMargin + 39, rowY + 4, { width: 320, lineGap: 1.5 });
        doc.text(r.bold ? '' : 'Rs.', leftMargin + 369, rowY + 8);
        
        const val = (r as any).amt ? (r as any).amt : 'Nil';
        doc.text(val, leftMargin + 409, rowY + 8, { width: 120, align: 'right' });
      });

      doc.y = startY + rowHeight * 17 + 10;

      // Verification on Page 2
      drawVerificationSection(taxRes.taxPayable);
    }

    // PART B PAGE 3 TABLE (Ref 17 to Ref 20 and Tax Deducted Summary)
    function drawPartBPage3Table() {
      const startY = doc.y;
      const rowHeight = 18;
      const colWidths = [35, 330, 40, 130];

      // Slabs boundaries
      doc.rect(leftMargin, startY, pageWidth, rowHeight * 5).stroke();

      let xAccum = leftMargin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        xAccum += colWidths[i];
        doc.moveTo(xAccum, startY).lineTo(xAccum, startY + rowHeight * 5).stroke();
      }

      // Headers
      doc.font('Helvetica-Bold').fontSize(7.5);
      doc.text('Ref', leftMargin + 4, startY + 5);
      doc.text('Tax Computation Details', leftMargin + 39, startY + 5);
      doc.text('Rs.', leftMargin + 369, startY + 5);
      doc.text('Amount', leftMargin + 409, startY + 5);
      doc.moveTo(leftMargin, startY + rowHeight).lineTo(rightMargin, startY + rowHeight).stroke();

      const finalRows = [
        { ref: '17.', part: 'Tax payable (13+15+16-14)', amt: formatAmount(taxRes.taxPayable), bold: true },
        { ref: '18.', part: 'Less: Relief under section 89 (attach details)', amt: 'Nil' },
        { ref: '19.', part: 'Less: Tax deducted/ collected at source as per Form No. 12BAA u/s 192(2B)', amt: 'Nil' },
        { ref: '20.', part: 'Net tax payable (17-18-19)', amt: formatAmount(taxRes.taxPayable), bold: true },
      ];

      finalRows.forEach((r, idx) => {
        const rowY = startY + rowHeight * (idx + 1);
        doc.moveTo(leftMargin, rowY).lineTo(rightMargin, rowY).stroke();

        doc.font(r.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.3);
        doc.text(r.ref, leftMargin + 4, rowY + 5);
        doc.text(r.part, leftMargin + 39, rowY + 5, { width: 320 });
        doc.text(r.bold ? '' : 'Rs.', leftMargin + 369, rowY + 5);
        doc.text(r.amt, leftMargin + 409, rowY + 5, { width: 120, align: 'right' });
      });

      doc.y = startY + rowHeight * 5 + 15;

      // Draw Summary Table
      const summaryTopY = doc.y;
      const sumColWidths = [45, 370, 120];
      const sumRowHeight = 22; // Increased to 22 for better vertical spacing

      doc.font('Helvetica-Bold').fontSize(8).text('Tax Deducted Summary (Summary of Tax Payable and Tax Deducted Information)', leftMargin, summaryTopY);
      
      const sumTableTopY = summaryTopY + 12;
      doc.rect(leftMargin, sumTableTopY, pageWidth, sumRowHeight * 6).stroke();
      doc.moveTo(leftMargin, sumTableTopY + sumRowHeight).lineTo(rightMargin, sumTableTopY + sumRowHeight).stroke();

      let xAccumSum = leftMargin;
      for (let i = 0; i < sumColWidths.length - 1; i++) {
        xAccumSum += sumColWidths[i];
        doc.moveTo(xAccumSum, sumTableTopY).lineTo(xAccumSum, sumTableTopY + sumRowHeight * 6).stroke();
      }

      doc.font('Helvetica-Bold').fontSize(7.5);
      doc.text('Sl. No.', leftMargin + 4, sumTableTopY + 7);
      doc.text('Particulars', leftMargin + 49, sumTableTopY + 7);
      doc.text('Amount', leftMargin + 420, sumTableTopY + 7);

      const sumRowsData = [
        { sl: '1', part: 'Tax Payable as per Part-B (SN 19)', amt: formatAmount(taxRes.taxPayable) },
        { sl: '2', part: 'Tax Deducted at Current Employment', amt: formatAmount(taxRes.taxDeducted) },
        { sl: '3', part: 'Tax Deducted at Previous Employment', amt: 'Nil' },
        { sl: '4', part: 'Total Tax Deducted (2+3)', amt: formatAmount(taxRes.taxDeducted), bold: true },
        { sl: '5', part: 'Net Tax Payable / Refundable (1-4)', amt: formatAmount(taxRes.netTaxPayableOrRefund), bold: true },
      ];

      sumRowsData.forEach((r, idx) => {
        const rowY = sumTableTopY + sumRowHeight * (idx + 1);
        doc.moveTo(leftMargin, rowY).lineTo(rightMargin, rowY).stroke();

        doc.font(r.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.3);
        doc.text(r.sl, leftMargin + 4, rowY + 7);
        doc.text(r.part, leftMargin + 49, rowY + 7);
        doc.text(r.amt, leftMargin + 420, rowY + 7, { width: 110, align: 'right' });
      });

      doc.y = sumTableTopY + sumRowHeight * 6 + 15;

      // Verification on Page 3
      drawVerificationSection(taxRes.taxPayable);
    }

    function drawFooter(pageText: string) {
      doc.font('Helvetica-Bold').fontSize(8.5);
      doc.text(pageText, leftMargin, 800, { align: 'right', width: pageWidth });
    }
  });
}
