# Task: Payslip PDF Generation API Endpoints

## Agent: Main Developer

## Summary
Created two API endpoints for generating payslip PDFs matching the Nidhi Impex format, plus a comprehensive payslip builder utility.

## Files Created

### 1. `/home/z/my-project/src/lib/payslip-builder.ts`
Core payslip PDF generation utility using `pdfkit`. Contains:
- **`numberToWords(num)`** - Converts numbers to Indian currency words (e.g., "Fifty Thousand Rupees and Thirty Paise Only") supporting Crore, Lakh, Thousand, Hundreds, and Paise
- **`buildPayslipPDF(data)`** - Generates a complete A4 PDF payslip with:
  - Company name (centered, bold, 18pt)
  - Company address (centered, 9pt)
  - Title "Pay Slip For the Month of {Month}-{Year}" (centered)
  - Period "(From 01/MM/YYYY To lastDay/MM/YYYY)"
  - Employee Info Box (bordered, two columns): Name, Code, Bank A/c, Bank Name, UAN, Mobile | Designation, Unit
  - Attendance Box (bordered): Total Paid Days, LWP, Net Paid Days
  - Earnings & Deductions table (side-by-side): BASIC, DA, HRA, Conv.A, Edu.A, Med.A, Prod. Ince., Total | PF, PT, ESI, TDS, LWF, ADVANCE, Total
  - Each row has: Label, Scale Rs., Amount Rs.
  - Net Pay section: amount + in words
  - Misc section: SALARY amount, cumulative TDS
  - Footer: "This is Computer Generated Sheet..." + company name
- **`mapSlipToPayslipData(slip, cumulativeTds)`** - Maps Prisma SalarySlip to PayslipData
- **`getSaveDir()`** - Ensures `uploads/payslips/` directory exists

### 2. `/home/z/my-project/src/app/api/v1/salary/slips/[id]/generate/route.ts`
**POST** endpoint to generate a single payslip PDF:
- Fetches slip with employee (including company, branch, bankDetail), batch
- Access control: EMPLOYEE sees own, ADMIN sees company's, SUPER_ADMIN sees all
- Calculates cumulative TDS for the employee up to the slip's month/year
- Generates PDF via `buildPayslipPDF()`
- Saves PDF to `uploads/payslips/payslip_{code}_{MM}_{YYYY}.pdf`
- Updates `salarySlip.pdfPath` in database
- Returns PDF as download with proper `Content-Disposition` header

### 3. `/home/z/my-project/src/app/api/v1/salary/batches/[id]/generate-all/route.ts`
**POST** endpoint to generate all payslips in a batch:
- Fetches batch with all salarySlips (including employee relations)
- Access control: ADMIN (company-scoped) and SUPER_ADMIN only
- Pre-computes cumulative TDS per unique employee
- Iterates all slips, generates individual PDFs, saves and updates `pdfPath`
- Returns JSON summary: total, generated count, failed count, per-slip results

## Package Installed
- `pdfkit@0.19.1` - Lightweight PDF generation

## Validation
- ESLint passes with no errors
- Dev server compiles successfully
- TypeScript type errors from raw `tsc` are only path alias/downlevelIteration (expected without tsconfig context)