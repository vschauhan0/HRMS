'use client';

import { numberToWords } from '@/lib/utils';

export interface Form16Quarters {
  q1Amount: number; q1Tds: number;
  q2Amount: number; q2Tds: number;
  q3Amount: number; q3Tds: number;
  q4Amount: number; q4Tds: number;
}

export interface Form16Tax {
  grossSalary: number;
  standardDeduction: number;
  chargeableSalary: number;
  grossTotalIncome: number;
  totalDeductionVIA: number;
  taxableIncome: number;
  taxOnTotalIncome: number;
  rebate87A: number;
  surcharge: number;
  cess: number;
  taxPayable: number;
  taxDeducted: number;
  netTaxPayableOrRefund: number;
  relief89?: number;
  otherTds?: number;
}

export interface Form16VIA {
  sec80C: number;
  sec80CCC: number;
  sec80CCD1: number;
  sec80CCD1B: number;
  sec80CCD2: number;
  sec80D: number;
  sec80E: number;
  sec80G: number;
  sec80TTA: number;
  otherDeductions: number;
}

export interface Form16ViewData {
  employerName: string;
  employerAddress: string;
  employerPan: string;
  employerTan: string;
  employeeName: string;
  employeePan: string;
  employeeCode: string;
  financialYear: string;
  assessmentYear: string;
  periodFrom: string;
  periodTo: string;
  quarters: Form16Quarters;
  via: Form16VIA;
  tax: Form16Tax;
  verificationPlace: string;
  verificationDate: string;
  verificationName: string;
  verificationDesignation: string;
}

export type Form16FieldName =
  | 'employerName' | 'employerAddress' | 'employerPan' | 'employerTan'
  | 'employeeName' | 'employeePan' | 'employeeCode'
  | 'periodFrom' | 'periodTo' | 'assessmentYear'
  | 'q1Amount' | 'q1Tds' | 'q2Amount' | 'q2Tds' | 'q3Amount' | 'q3Tds' | 'q4Amount' | 'q4Tds'
  | 'standardDeduction'
  | 'sec80C' | 'sec80CCC' | 'sec80CCD1' | 'sec80CCD1B' | 'sec80CCD2' | 'sec80D' | 'sec80E' | 'sec80G' | 'sec80TTA' | 'otherDeductions'
  | 'rebate87AOverride' | 'relief89' | 'otherTds'
  | 'verificationPlace' | 'verificationDate' | 'verificationName' | 'verificationDesignation';

interface Form16PagesProps {
  data: Form16ViewData;
  editable?: boolean;
  onFieldChange?: (field: Form16FieldName, value: string | number) => void;
}

export function calculateForm16TaxClient(data: any) {
  const q1A = Number(data.q1Amount || 0);
  const q1T = Number(data.q1Tds || 0);
  const q2A = Number(data.q2Amount || 0);
  const q2T = Number(data.q2Tds || 0);
  const q3A = Number(data.q3Amount || 0);
  const q3T = Number(data.q3Tds || 0);
  const q4A = Number(data.q4Amount || 0);
  const q4T = Number(data.q4Tds || 0);

  const totalGross = q1A + q2A + q3A + q4A;
  const totalTds = q1T + q2T + q3T + q4T;

  const standardDeduction = Number(data.standardDeduction || 0);
  const sec80C = Number(data.sec80C || 0);
  const sec80CCC = Number(data.sec80CCC || 0);
  const sec80CCD1 = Number(data.sec80CCD1 || 0);
  const sec80CCD1B = Number(data.sec80CCD1B || 0);
  const sec80CCD2 = Number(data.sec80CCD2 || 0);
  const sec80D = Number(data.sec80D || 0);
  const sec80E = Number(data.sec80E || 0);
  const sec80G = Number(data.sec80G || 0);
  const sec80TTA = Number(data.sec80TTA || 0);
  const otherDeductions = Number(data.otherDeductions || 0);

  const totalDeductionVIA = sec80C + sec80CCC + sec80CCD1 + sec80CCD1B + sec80CCD2 + sec80D + sec80E + sec80G + sec80TTA + otherDeductions;
  const chargeableSalary = Math.max(0, totalGross - standardDeduction);
  const grossTotalIncome = chargeableSalary;
  const taxableIncome = Math.max(0, grossTotalIncome - totalDeductionVIA);

  let taxOnTotalIncome = 0;
  if (taxableIncome > 2000000) {
    taxOnTotalIncome = 200000 + (taxableIncome - 2000000) * 0.3;
  } else if (taxableIncome > 1600000) {
    taxOnTotalIncome = 120000 + (taxableIncome - 1600000) * 0.2;
  } else if (taxableIncome > 1200000) {
    taxOnTotalIncome = 60000 + (taxableIncome - 1200000) * 0.15;
  } else if (taxableIncome > 800000) {
    taxOnTotalIncome = 20000 + (taxableIncome - 800000) * 0.1;
  } else if (taxableIncome > 400000) {
    taxOnTotalIncome = (taxableIncome - 400000) * 0.05;
  }

  const rebate87A = data.rebate87AOverride !== null && data.rebate87AOverride !== undefined
    ? Number(data.rebate87AOverride)
    : (taxableIncome <= 700000 ? taxOnTotalIncome : 0);

  const taxAfterRebate = Math.max(0, taxOnTotalIncome - rebate87A);
  const cess = Math.round(taxAfterRebate * 0.04);
  const taxPayable = taxAfterRebate + cess;

  const relief89 = Number(data.relief89 || 0);
  const otherTds = Number(data.otherTds || 0);
  const netTaxPayableOrRefund = taxPayable - relief89 - otherTds - totalTds;

  return {
    totalGross,
    totalTds,
    standardDeduction,
    chargeableSalary,
    grossTotalIncome,
    totalDeductionVIA,
    taxableIncome,
    taxOnTotalIncome,
    rebate87A,
    cess,
    taxPayable,
    taxDeducted: totalTds + relief89 + otherTds,
    netTaxPayableOrRefund,
    relief89,
    otherTds,
  };
}

export function mapEditDataToForm16ViewData(editData: any): Form16ViewData {
  const calcs = calculateForm16TaxClient(editData);
  return {
    employerName: editData.employerName || '',
    employerAddress: editData.employerAddress || '',
    employerPan: editData.employerPan || '',
    employerTan: editData.employerTan || '',
    employeeName: editData.employeeName || '',
    employeePan: editData.employeePan || '',
    employeeCode: editData.employeeCode || '',
    financialYear: editData.financialYear || '',
    assessmentYear: editData.assessmentYear || '',
    periodFrom: editData.periodFrom || '',
    periodTo: editData.periodTo || '',
    quarters: {
      q1Amount: Number(editData.q1Amount || 0), q1Tds: Number(editData.q1Tds || 0),
      q2Amount: Number(editData.q2Amount || 0), q2Tds: Number(editData.q2Tds || 0),
      q3Amount: Number(editData.q3Amount || 0), q3Tds: Number(editData.q3Tds || 0),
      q4Amount: Number(editData.q4Amount || 0), q4Tds: Number(editData.q4Tds || 0),
    },
    via: {
      sec80C: Number(editData.sec80C || 0),
      sec80CCC: Number(editData.sec80CCC || 0),
      sec80CCD1: Number(editData.sec80CCD1 || 0),
      sec80CCD1B: Number(editData.sec80CCD1B || 0),
      sec80CCD2: Number(editData.sec80CCD2 || 0),
      sec80D: Number(editData.sec80D || 0),
      sec80E: Number(editData.sec80E || 0),
      sec80G: Number(editData.sec80G || 0),
      sec80TTA: Number(editData.sec80TTA || 0),
      otherDeductions: Number(editData.otherDeductions || 0),
    },
    tax: {
      grossSalary: calcs.totalGross,
      standardDeduction: calcs.standardDeduction,
      chargeableSalary: calcs.chargeableSalary,
      grossTotalIncome: calcs.grossTotalIncome,
      totalDeductionVIA: calcs.totalDeductionVIA,
      taxableIncome: calcs.taxableIncome,
      taxOnTotalIncome: calcs.taxOnTotalIncome,
      rebate87A: calcs.rebate87A,
      surcharge: 0,
      cess: calcs.cess,
      taxPayable: calcs.taxPayable,
      taxDeducted: calcs.taxDeducted,
      netTaxPayableOrRefund: calcs.netTaxPayableOrRefund,
      relief89: calcs.relief89,
      otherTds: calcs.otherTds,
    },
    verificationPlace: editData.verificationPlace || '',
    verificationDate: editData.verificationDate || '',
    verificationName: editData.verificationName || '',
    verificationDesignation: editData.verificationDesignation || '',
  };
}

export function mapPreviewDataToForm16ViewData(previewData: any): Form16ViewData {
  const t = previewData.taxCalculations || {};
  const q = previewData.quarters || {};
  return {
    employerName: previewData.employerName || '',
    employerAddress: previewData.employerAddress || '',
    employerPan: previewData.employerPan || '',
    employerTan: previewData.employerTan || '',
    employeeName: previewData.employeeName || '',
    employeePan: previewData.employeePan || '',
    employeeCode: previewData.employeeCode || '',
    financialYear: previewData.financialYear || '',
    assessmentYear: previewData.assessmentYear || '',
    periodFrom: previewData.periodFrom || '',
    periodTo: previewData.periodTo || '',
    quarters: {
      q1Amount: q.q1Amount || 0, q1Tds: q.q1Tds || 0,
      q2Amount: q.q2Amount || 0, q2Tds: q.q2Tds || 0,
      q3Amount: q.q3Amount || 0, q3Tds: q.q3Tds || 0,
      q4Amount: q.q4Amount || 0, q4Tds: q.q4Tds || 0,
    },
    via: {
      sec80C: 0, sec80CCC: 0, sec80CCD1: 0, sec80CCD1B: 0, sec80CCD2: 0,
      sec80D: 0, sec80E: 0, sec80G: 0, sec80TTA: 0, otherDeductions: 0,
    },
    tax: {
      grossSalary: t.grossSalary || 0,
      standardDeduction: t.standardDeduction || 0,
      chargeableSalary: t.chargeableSalary || 0,
      grossTotalIncome: t.grossTotalIncome || 0,
      totalDeductionVIA: t.totalDeductionVIA || 0,
      taxableIncome: t.taxableIncome || 0,
      taxOnTotalIncome: t.taxOnTotalIncome || 0,
      rebate87A: t.rebate87A || 0,
      surcharge: t.surcharge || 0,
      cess: t.cess || 0,
      taxPayable: t.taxPayable || 0,
      taxDeducted: t.taxDeducted || 0,
      netTaxPayableOrRefund: t.netTaxPayableOrRefund || 0,
    },
    verificationPlace: previewData.verificationPlace || '',
    verificationDate: previewData.verificationDate || '',
    verificationName: previewData.verificationName || '',
    verificationDesignation: previewData.verificationDesignation || '',
  };
}

const fmt = (n: number | undefined | null) => {
  const num = Number(n || 0);
  if (!num) return 'Nil';
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};
const fmtRs = (n: number | undefined | null) => `Rs. ${fmt(n)}`;

const td = 'border border-black px-2 py-1 align-top text-[11px] leading-snug';

function EText({ editable, value, onChange, align = 'left', className = '' }: {
  editable?: boolean;
  value: string;
  onChange?: (v: string) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  if (!editable) return <>{value}</>;
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      className={`w-full bg-amber-50 focus:bg-amber-100 outline-none border-b border-dashed border-amber-500 px-0.5 font-[inherit] text-[inherit] font-inherit ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`}
    />
  );
}

function ENum({ editable, value, onChange, align = 'right', className = '' }: {
  editable?: boolean;
  value: number;
  onChange?: (v: number) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  if (!editable) return <>{fmt(value)}</>;
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange?.(Number(e.target.value))}
      className={`w-full bg-amber-50 focus:bg-amber-100 outline-none border-b border-dashed border-amber-500 px-0.5 font-[inherit] text-[inherit] ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`}
    />
  );
}

function VerificationBlock({
  data, editable, onFieldChange, closingText,
}: {
  data: Form16ViewData;
  editable?: boolean;
  onFieldChange?: (field: Form16FieldName, value: string | number) => void;
  closingText: string;
}) {
  const amount = data.tax.taxPayable > 0 ? fmt(data.tax.taxPayable) : 'Nil';
  const words = data.tax.taxPayable > 0 ? numberToWords(data.tax.taxPayable) : 'Zero Rupees Only';
  return (
    <>
      <table className="-mt-[1px] w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${td} text-center font-bold text-[13px]`}>Verification</td>
          </tr>
          <tr>
            <td className={`${td} leading-relaxed`}>
              I,{' '}
              <span className="font-bold underline">
                <EText editable={editable} value={data.verificationName} onChange={(v) => onFieldChange?.('verificationName', v)} />
              </span>
              , son/daughter of <span className="inline-block min-w-[80px] border-b border-black">&nbsp;</span> working in the capacity of{' '}
              <span className="inline-block min-w-[100px] border-b border-black font-bold">
                <EText editable={editable} value={data.verificationDesignation} onChange={(v) => onFieldChange?.('verificationDesignation', v)} align="center" />
              </span>{' '}
              (designation) do hereby certify that {closingText === 'PART_A' ? (
                <>a sum of Rs. <span className="font-bold underline">{amount}</span> [{words} (in words)] has been deducted and deposited to the credit of the Central Government. I further certify that</>
              ) : null} the information given above is true, complete and correct and is based on the book of accounts, documents, TDS statements{closingText === 'PART_A' ? ', TDS deposited' : ''} and other available records.
            </td>
          </tr>
        </tbody>
      </table>
      <div className="-mt-[1px]">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={`${td} font-bold w-28`}>Place</td>
              <td className={td} colSpan={closingText === 'PART_A' ? 1 : 3}>
                <EText editable={editable} value={data.verificationPlace} onChange={(v) => onFieldChange?.('verificationPlace', v)} />
              </td>
              <td rowSpan={2} className={`${td} align-middle text-center`}>(Signature of person responsible for deduction of tax)</td>
            </tr>
            <tr>
              <td className={`${td} font-bold`}>Date</td>
              <td className={td} colSpan={closingText === 'PART_A' ? 1 : 3}>
                <EText editable={editable} value={data.verificationDate} onChange={(v) => onFieldChange?.('verificationDate', v)} />
              </td>
            </tr>
            <tr>
              <td className={`${td} font-bold`} colSpan={closingText === 'PART_A' ? 1 : 2}>Designation:</td>
              <td className={td} colSpan={closingText === 'PART_A' ? 1 : 2}>
                <EText editable={editable} value={data.verificationDesignation} onChange={(v) => onFieldChange?.('verificationDesignation', v)} />
              </td>
              <td className={td}><span className="font-bold">Full Name:</span> {data.verificationName}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Form16Pages({ data, editable, onFieldChange }: Form16PagesProps) {
  const change = (field: Form16FieldName, value: string | number) => onFieldChange?.(field, value);
  const q = data.quarters;
  const via = data.via;
  const tax = data.tax;
  const totalGross = q.q1Amount + q.q2Amount + q.q3Amount + q.q4Amount;
  const totalTds = q.q1Tds + q.q2Tds + q.q3Tds + q.q4Tds;
  const totalVIAabc = via.sec80C + via.sec80CCC + via.sec80CCD1;
  const totalVIAefghkln = via.sec80CCD1B + via.sec80CCD2 + via.sec80D + via.sec80E + via.sec80G + via.sec80TTA + via.otherDeductions;

  const sectionStyle = { fontFamily: '"Times New Roman", serif' } as const;
  const sectionClass = 'mx-auto w-full max-w-[960px] bg-white px-8 py-7 text-black shadow-[0_22px_50px_rgba(15,23,42,0.12)]';

  return (
    <div className="rounded-3xl border border-gray-200 bg-neutral-300 px-3 py-5 shadow-sm dark:border-gray-700 sm:px-5 sm:py-6">
      <div className="space-y-8">

        {/* ==================== PART A ==================== */}
        <section className={sectionClass} aria-label="Form 16 Part A" style={sectionStyle}>
          <table className="w-full border-collapse">
            <tbody>
              <tr><td className={`${td} text-center text-[18px] font-bold tracking-wide py-2`}>FORM NO. 16</td></tr>
              <tr><td className={`${td} text-center text-[12px] italic`}>[See rule 31(1)(a)]</td></tr>
              <tr><td className={`${td} text-center text-[16px] font-bold py-1`}>PART A</td></tr>
              <tr><td className={`${td} text-center text-[12px] font-bold`}>Certificate under section 203 of the Income-tax Act, 1961 for Tax deducted at source on Salary</td></tr>
            </tbody>
          </table>

          <table className="-mt-[1px] w-full border-collapse">
            <tbody>
              <tr>
                <td className={td}><span className="font-bold">Certificate No.</span> __________</td>
                <td className={td}><span className="font-bold">Last updated on</span> __/__/____</td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={`${td} font-bold w-1/2`}>Name and address of the Employer</td>
                <td className={`${td} font-bold w-1/2`}>Name and address of the Employee</td>
              </tr>
              <tr>
                <td className={td}>
                  <div className="font-bold">
                    <EText editable={editable} value={data.employerName} onChange={(v) => change('employerName', v)} />
                  </div>
                  <div>
                    <EText editable={editable} value={data.employerAddress} onChange={(v) => change('employerAddress', v)} />
                  </div>
                </td>
                <td className={td}>
                  <div className="font-bold">
                    <EText editable={editable} value={data.employeeName} onChange={(v) => change('employeeName', v)} />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={`${td} font-bold`}>PAN of the Deductor</td>
                <td className={`${td} font-bold`}>TAN of the Deductor</td>
                <td className={`${td} font-bold`}>PAN of the Employee</td>
                <td className={`${td} font-bold`}>Employee Reference No. provided by the Employer (If available)</td>
              </tr>
              <tr>
                <td className={td}><EText editable={editable} value={data.employerPan} onChange={(v) => change('employerPan', v.toUpperCase())} /></td>
                <td className={td}><EText editable={editable} value={data.employerTan} onChange={(v) => change('employerTan', v.toUpperCase())} /></td>
                <td className={td}><EText editable={editable} value={data.employeePan} onChange={(v) => change('employeePan', v.toUpperCase())} /></td>
                <td className={td}><EText editable={editable} value={data.employeeCode} onChange={(v) => change('employeeCode', v)} /></td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td rowSpan={2} className={`${td} font-bold`}>CIT (TDS)</td>
                <td rowSpan={2} className={`${td} font-bold`}>Assessment Year</td>
                <td colSpan={2} className={`${td} font-bold text-center`}>Period with the Employer</td>
              </tr>
              <tr>
                <td className={`${td} font-bold`}>From</td>
                <td className={`${td} font-bold`}>To</td>
              </tr>
              <tr>
                <td className={td}>The Commissioner of Income Tax (TDS)</td>
                <td className={td}><EText editable={editable} value={data.assessmentYear} onChange={(v) => change('assessmentYear', v)} /></td>
                <td className={td}><EText editable={editable} value={data.periodFrom} onChange={(v) => change('periodFrom', v)} /></td>
                <td className={td}><EText editable={editable} value={data.periodTo} onChange={(v) => change('periodTo', v)} /></td>
              </tr>
            </tbody>
          </table>

          <table className="-mt-[1px] w-full border-collapse">
            <thead>
              <tr><th colSpan={5} className={`${td} font-bold text-center`}>Summary of amount paid/credited and tax deducted at source thereon in respect of the employee</th></tr>
              <tr>
                <th className={`${td} font-bold`}>Quarter(s)</th>
                <th className={`${td} font-bold`}>Receipt Numbers of original statements of TDS under sub-section (3) of section 200</th>
                <th className={`${td} font-bold text-right`}>Amount paid/credited</th>
                <th className={`${td} font-bold text-right`}>Amount of tax deducted (Rs.)</th>
                <th className={`${td} font-bold text-right`}>Amount of tax deposited/remitted (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Q1', 'q1Amount', 'q1Tds', q.q1Amount, q.q1Tds],
                ['Q2', 'q2Amount', 'q2Tds', q.q2Amount, q.q2Tds],
                ['Q3', 'q3Amount', 'q3Tds', q.q3Amount, q.q3Tds],
                ['Q4', 'q4Amount', 'q4Tds', q.q4Amount, q.q4Tds],
              ] as const).map(([label, amtField, tdsField, amt, tdsVal]) => (
                <tr key={label}>
                  <td className={td}>{label}</td>
                  <td className={td}></td>
                  <td className={`${td} text-right`}><ENum editable={editable} value={amt} onChange={(v) => change(amtField, v)} /></td>
                  <td className={`${td} text-right`}><ENum editable={editable} value={tdsVal} onChange={(v) => change(tdsField, v)} /></td>
                  <td className={`${td} text-right`}>{fmt(tdsVal)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} className={`${td} font-bold`}>Total (Rs.)</td>
                <td className={`${td} text-right font-bold`}>{fmt(totalGross)}</td>
                <td className={`${td} text-right font-bold`}>{fmt(totalTds)}</td>
                <td className={`${td} text-right font-bold`}>{fmt(totalTds)}</td>
              </tr>
            </tbody>
          </table>

          <table className="-mt-[1px] w-full border-collapse">
            <thead>
              <tr><th colSpan={6} className={`${td} font-bold text-center`}>I. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH BOOK ADJUSTMENT</th></tr>
              <tr><th colSpan={6} className={`${td} italic text-center text-[10px]`}>(The Deductor to provide payment wise details of tax deducted and deposited with respect to the deductee)</th></tr>
              <tr>
                <th rowSpan={2} className={`${td} font-bold`}>S. No.</th>
                <th rowSpan={2} className={`${td} font-bold`}>Tax Deposited in respect of the Deductee (Rs.)</th>
                <th colSpan={4} className={`${td} font-bold text-center`}>Book identification number (BIN)</th>
              </tr>
              <tr>
                <th className={`${td} font-bold`}>Receipt numbers of Form No. 24G</th>
                <th className={`${td} font-bold`}>DDO Sequence Number in the Book Adjustment Mini Statement</th>
                <th className={`${td} font-bold`}>Date on which tax deposited (dd/mm/yyyy)</th>
                <th className={`${td} font-bold`}>Status of matching with Form No. 24G</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={6} className={`${td} font-bold`}>Total (Rs.)</td></tr>
            </tbody>
          </table>

          <table className="-mt-[1px] w-full border-collapse">
            <thead>
              <tr><th colSpan={6} className={`${td} font-bold text-center`}>II. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH CHALLAN</th></tr>
              <tr><th colSpan={6} className={`${td} italic text-center text-[10px]`}>(The Deductor to provide payment wise details of tax deducted and deposited with respect to the deductee)</th></tr>
              <tr>
                <th rowSpan={2} className={`${td} font-bold`}>S. No.</th>
                <th rowSpan={2} className={`${td} font-bold`}>Tax Deposited in respect of the Deductee (Rs.)</th>
                <th colSpan={4} className={`${td} font-bold text-center`}>Book identification number (BIN)</th>
              </tr>
              <tr>
                <th className={`${td} font-bold`}>BSR Code of the Bank Branch</th>
                <th className={`${td} font-bold`}>Date on which tax deposited (dd/mm/yyyy)</th>
                <th className={`${td} font-bold`}>Challan Serial Number</th>
                <th className={`${td} font-bold`}>Status of matching with OLTAS</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={6} className={`${td} font-bold`}>Total (Rs.)</td></tr>
            </tbody>
          </table>

          <VerificationBlock data={data} editable={editable} onFieldChange={onFieldChange} closingText="PART_A" />

          <div className="mt-6 border-t border-black pt-2 text-right text-[11px] font-bold">Page 1 of 1</div>
        </section>

        {/* ==================== PART B PAGE 1 ==================== */}
        <section className={sectionClass} aria-label="Form 16 Part B Page 1" style={sectionStyle}>
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={`${td} font-bold`}>TAN of Employer</td>
                <td className={`${td} font-bold`}>Name of Employee</td>
                <td className={`${td} font-bold`}>PAN of Employee</td>
                <td className={`${td} font-bold`}>Assessment Year</td>
              </tr>
              <tr>
                <td className={td}>{data.employerTan}</td>
                <td className={td}>{data.employeeName}</td>
                <td className={td}>{data.employeePan}</td>
                <td className={td}>{data.assessmentYear}</td>
              </tr>
            </tbody>
          </table>

          <table className="-mt-[1px] w-full border-collapse">
            <tbody>
              <tr><td colSpan={4} className={`${td} text-center text-[15px] font-bold py-1`}>PART B (Annexure-I)</td></tr>
              <tr><td colSpan={4} className={`${td} font-bold`}>Details of Salary paid and any other income and tax deducted</td></tr>
              <tr>
                <td className={`${td} font-bold w-10`}>A</td>
                <td colSpan={2} className={`${td} font-bold`}>Whether opting out of taxation u/s 115BAC(1A)?</td>
                <td className={`${td} font-bold text-right w-32`}>NO</td>
              </tr>
              <tr>
                <td className={`${td} font-bold`}>1.</td>
                <td colSpan={3} className={`${td} font-bold`}>Gross Salary</td>
              </tr>
              <tr>
                <td className={td}>(a)</td>
                <td className={td}>Salary as per provisions contained in section 17(1)</td>
                <td className={`${td} text-right w-12`}>Rs.</td>
                <td className={`${td} text-right`}>{fmt(totalGross)}</td>
              </tr>
              <tr>
                <td className={td}>(b)</td>
                <td className={td}>Value of perquisites under section 17(2) (as per Form No. 12BA, wherever applicable)</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>(c)</td>
                <td className={td}>Profits in lieu of salary under section 17(3) (as per Form No. 12BA, wherever applicable)</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>(d)</td>
                <td className={td}>Total</td>
                <td className={td}></td>
                <td className={`${td} text-right`}>{fmtRs(totalGross)}</td>
              </tr>
              <tr>
                <td className={td}>(e)</td>
                <td className={td}>Reported total amount of salary received from other employer(s)</td>
                <td className={td}></td>
                <td className={`${td} text-right`}>Rs. Nil</td>
              </tr>
              <tr>
                <td className={`${td} font-bold`}>2.</td>
                <td colSpan={3} className={`${td} font-bold`}>Less: Allowance to the extent exempt under section 10</td>
              </tr>
              <tr>
                <td className={td}>(a)</td>
                <td className={td}>Travel concession or assistance under section 10(5)</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>(b)</td>
                <td className={td}>Death-cum-retirement gratuity under section 10(10)</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>(c)</td>
                <td className={td}>Commuted value of pension under section 10(10A)</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>(d)</td>
                <td className={td}>Cash equivalent of leave salary encashment under section 10(10AA)</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>(e)</td>
                <td className={td}>House rent allowance under section 10(13A)</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>(f)</td>
                <td className={td}>Other special allowances under section 10(14)</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>(g)</td>
                <td colSpan={3} className={td}>Amount of any other exemption under section 10</td>
              </tr>
              <tr>
                <td className={td}></td>
                <td className={td}></td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>(h)</td>
                <td className={td}>Total amount of any other exemption under section 10</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>(i)</td>
                <td className={td}>Total amount of exemption claimed under section 10 [2(a)+2(b)+2(c)+2(d)+2(e)+2(f)+2(h)]</td>
                <td className={td}></td>
                <td className={`${td} text-right`}>Rs. Nil</td>
              </tr>
              <tr>
                <td className={td}>3.</td>
                <td className={td}>Total amount of salary received from current employer [1(d)-2(i)]</td>
                <td className={td}></td>
                <td className={`${td} text-right`}>{fmtRs(totalGross)}</td>
              </tr>
              <tr>
                <td className={`${td} font-bold`}>4.</td>
                <td colSpan={3} className={`${td} font-bold`}>Less: Deductions under section 16</td>
              </tr>
              <tr>
                <td className={td}>(a)</td>
                <td className={td}>Standard deduction under section 16(ia)</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}><ENum editable={editable} value={tax.standardDeduction} onChange={(v) => change('standardDeduction', v)} /></td>
              </tr>
              <tr>
                <td className={td}>(b)</td>
                <td className={td}>Entertainment allowance under section 16(ii)</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>(c)</td>
                <td className={td}>Tax on employment under section 16(iii)</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>5.</td>
                <td className={td}>Total amount of deductions under section 16 [4(a)+4(b)+4(c)]</td>
                <td className={td}></td>
                <td className={`${td} text-right`}>{fmtRs(tax.standardDeduction)}</td>
              </tr>
              <tr>
                <td className={td}>6.</td>
                <td className={td}>Income chargeable under the head &ldquo;Salaries&rdquo; [3+1(e)-5]</td>
                <td className={td}></td>
                <td className={`${td} text-right`}>{fmtRs(tax.chargeableSalary)}</td>
              </tr>
              <tr>
                <td className={td}>7.</td>
                <td colSpan={3} className={td}>Add: Any other income reported by the employee under as per section 192 (2B)</td>
              </tr>
              <tr>
                <td className={td}>(a)</td>
                <td className={td}>Income (or admissible loss) from house property reported by employee offered for TDS</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>(b)</td>
                <td className={td}>Income under the head Other Sources offered for TDS</td>
                <td className={`${td} text-right`}>Rs.</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>8.</td>
                <td className={td}>Total amount of other income reported by the employee [7(a)+7(b)]</td>
                <td className={td}></td>
                <td className={`${td} text-right`}>Rs. Nil</td>
              </tr>
              <tr>
                <td className={td}>9.</td>
                <td className={td}>Gross total income (6+8)</td>
                <td className={td}></td>
                <td className={`${td} text-right`}>{fmtRs(tax.grossTotalIncome)}</td>
              </tr>
              <tr>
                <td className={`${td} font-bold`}>10.</td>
                <td colSpan={3} className={`${td} font-bold`}>Deductions under Chapter VI-A</td>
              </tr>
              <tr>
                <td className={td}></td>
                <td className={td}></td>
                <td className={`${td} font-bold text-right`}>Gross Amount</td>
                <td className={`${td} font-bold text-right`}>Deductible Amount</td>
              </tr>
              <tr>
                <td className={td}>(a)</td>
                <td className={td}>Deduction in respect of life insurance premia, contributions to provident fund etc. under section 80C</td>
                <td className={`${td} text-right`}>Rs. <ENum editable={editable} value={via.sec80C} onChange={(v) => change('sec80C', v)} /></td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80C)}</td>
              </tr>
              <tr>
                <td className={td}>(b)</td>
                <td className={td}>Deduction in respect of contribution to certain pension funds under section 80CCC</td>
                <td className={`${td} text-right`}>Rs. <ENum editable={editable} value={via.sec80CCC} onChange={(v) => change('sec80CCC', v)} /></td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80CCC)}</td>
              </tr>
              <tr>
                <td className={td}>(c)</td>
                <td className={td}>Deduction in respect of contribution by taxpayer to pension scheme under section 80CCD (1)</td>
                <td className={`${td} text-right`}>Rs. <ENum editable={editable} value={via.sec80CCD1} onChange={(v) => change('sec80CCD1', v)} /></td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80CCD1)}</td>
              </tr>
              <tr>
                <td className={td}>(d)</td>
                <td className={td}>Total deduction under section 80C, 80CCC and 80CCD(1)</td>
                <td className={`${td} text-right`}>{fmtRs(totalVIAabc)}</td>
                <td className={`${td} text-right`}>{fmtRs(totalVIAabc)}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-6 border-t border-black pt-2 text-right text-[11px] font-bold">Page 1 of 3</div>
        </section>

        {/* ==================== PART B PAGE 2 ==================== */}
        <section className={sectionClass} aria-label="Form 16 Part B Page 2" style={sectionStyle}>
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className={td}></td>
                <td className={td}></td>
                <td className={`${td} font-bold text-right`}>Gross Amount</td>
                <td className={`${td} font-bold text-right`}>Qualifying Amount</td>
                <td className={`${td} font-bold text-right`}>Deductible Amount</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>(e)</td>
                <td className={td}>Deductions in respect of amount paid/deposited to notified pension scheme under section 80CCD (1B)</td>
                <td className={`${td} text-right`}>Rs. <ENum editable={editable} value={via.sec80CCD1B} onChange={(v) => change('sec80CCD1B', v)} /></td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80CCD1B)}</td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80CCD1B)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>(f)</td>
                <td className={td}>Deduction in respect of contribution by Employer to pension scheme under section 80CCD (2)</td>
                <td className={`${td} text-right`}>Rs. <ENum editable={editable} value={via.sec80CCD2} onChange={(v) => change('sec80CCD2', v)} /></td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80CCD2)}</td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80CCD2)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>(g)</td>
                <td className={td}>Deduction in respect of health insurance premia under section 80D</td>
                <td className={`${td} text-right`}>Rs. <ENum editable={editable} value={via.sec80D} onChange={(v) => change('sec80D', v)} /></td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80D)}</td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80D)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>(h)</td>
                <td className={td}>Deduction in respect of interest on loan taken for higher education under section 80E</td>
                <td className={`${td} text-right`}>Rs. <ENum editable={editable} value={via.sec80E} onChange={(v) => change('sec80E', v)} /></td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80E)}</td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80E)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>(i)</td>
                <td className={td}>Deduction in respect of contribution by the employee to Agnipath Scheme under section 80CCH</td>
                <td className={`${td} text-right`}>Rs. Nil</td>
                <td className={`${td} text-right`}>Rs. Nil</td>
                <td className={`${td} text-right`}>Rs. Nil</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>(j)</td>
                <td className={td}>Deduction in respect of contribution by the Central Government to Agnipath Scheme under section 80CCH</td>
                <td className={`${td} text-right`}>Rs. Nil</td>
                <td className={`${td} text-right`}>Rs. Nil</td>
                <td className={`${td} text-right`}>Rs. Nil</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>(k)</td>
                <td className={td}>Total Deduction in respect of donations to certain funds, charitable institutions, etc. under section 80G</td>
                <td className={`${td} text-right`}>Rs. <ENum editable={editable} value={via.sec80G} onChange={(v) => change('sec80G', v)} /></td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80G)}</td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80G)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>(l)</td>
                <td className={td}>Deduction in respect of interest on deposits in savings account under section 80TTA</td>
                <td className={`${td} text-right`}>Rs. <ENum editable={editable} value={via.sec80TTA} onChange={(v) => change('sec80TTA', v)} /></td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80TTA)}</td>
                <td className={`${td} text-right`}>{fmtRs(via.sec80TTA)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>(m)</td>
                <td className={td}>Amount deductible under any other provision(s) of Chapter VI-A</td>
                <td className={`${td} text-right`}>Rs. <ENum editable={editable} value={via.otherDeductions} onChange={(v) => change('otherDeductions', v)} /></td>
                <td className={`${td} text-right`}>{fmtRs(via.otherDeductions)}</td>
                <td className={`${td} text-right`}>{fmtRs(via.otherDeductions)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>(n)</td>
                <td className={td}>Total of amount deductible under any other provision(s) of Chapter VI-A</td>
                <td className={`${td} text-right`}>{fmtRs(via.otherDeductions)}</td>
                <td className={`${td} text-right`}>{fmtRs(via.otherDeductions)}</td>
                <td className={`${td} text-right`}>{fmtRs(via.otherDeductions)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>11.</td>
                <td colSpan={3} className={td}>Aggregate of deductible amount under Chapter VI-A [10(d)+10(e)+10(f)+10(g)+10(h)+10(i)+10(j)+10(k)+10(l)+10(n)]</td>
                <td className={`${td} text-right w-32`}>{fmtRs(tax.totalDeductionVIA)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>12.</td>
                <td colSpan={3} className={td}>Total taxable income (9-11)</td>
                <td className={`${td} text-right w-32`}>{fmtRs(tax.taxableIncome)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>13.</td>
                <td colSpan={3} className={td}>Tax on total income</td>
                <td className={`${td} text-right w-32`}>{fmtRs(tax.taxOnTotalIncome)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>14.</td>
                <td colSpan={3} className={td}>Rebate under section 87A, if applicable</td>
                <td className={`${td} text-right w-32`}>
                  {editable ? <ENum editable value={tax.rebate87A} onChange={(v) => change('rebate87AOverride', v)} /> : fmtRs(tax.rebate87A)}
                </td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>15.</td>
                <td colSpan={3} className={td}>Surcharge, wherever applicable</td>
                <td className={`${td} text-right w-32`}>Rs. Nil</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>16.</td>
                <td colSpan={3} className={td}>Health and education cess @ 4%</td>
                <td className={`${td} text-right w-32`}>{fmtRs(tax.cess)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>17.</td>
                <td colSpan={3} className={td}>Tax payable (13+15+16-14)</td>
                <td className={`${td} text-right w-32`}>{fmtRs(tax.taxPayable)}</td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>18.</td>
                <td colSpan={3} className={td}>Less: Relief under section 89 (attach details)</td>
                <td className={`${td} text-right w-32`}><ENum editable={editable} value={tax.relief89 || 0} onChange={(v) => change('relief89', v)} /></td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>19.</td>
                <td colSpan={3} className={td}>Less : Tax deducted/ collected at source as per Form No. 12BAA submitted under provisions of section 192(2B)</td>
                <td className={`${td} text-right w-32`}><ENum editable={editable} value={tax.otherTds || 0} onChange={(v) => change('otherTds', v)} /></td>
              </tr>
              <tr>
                <td className={`${td} w-10`}>20.</td>
                <td colSpan={3} className={td}>Net tax payable (17-18-19)</td>
                <td className={`${td} text-right w-32`}>{fmtRs(tax.taxPayable - (tax.relief89 || 0) - (tax.otherTds || 0))}</td>
              </tr>
            </tbody>
          </table>

          <VerificationBlock data={data} editable={editable} onFieldChange={onFieldChange} closingText="PART_B" />

          <div className="mt-6 border-t border-black pt-2 text-right text-[11px] font-bold">Page 2 of 3</div>
        </section>

        {/* ==================== PART B PAGE 3 ==================== */}
        <section className={sectionClass} aria-label="Form 16 Part B Page 3" style={sectionStyle}>
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td colSpan={2} className={`${td} font-bold text-center`}>Name of the Employer</td>
                <td colSpan={3} className={`${td} font-bold text-center`}>Name of the Employee</td>
              </tr>
              <tr>
                <td colSpan={2} className={`${td} text-center`}>{data.employerName}</td>
                <td colSpan={3} className={`${td} text-center`}>{data.employeeName}</td>
              </tr>
              <tr>
                <td className={`${td} font-bold`}>PAN of the Deductor</td>
                <td className={`${td} font-bold`}>TAN of the Deductor</td>
                <td className={`${td} font-bold`}>PAN of the Employee</td>
                <td className={`${td} font-bold`}>Assessment Year</td>
                <td className={`${td} font-bold`}>Financial Year</td>
              </tr>
              <tr>
                <td className={td}>{data.employerPan}</td>
                <td className={td}>{data.employerTan}</td>
                <td className={td}>{data.employeePan}</td>
                <td className={td}>{data.assessmentYear}</td>
                <td className={td}>{data.financialYear}</td>
              </tr>
              <tr><td colSpan={5} className={`${td} text-center text-[15px] font-bold py-1`}>Tax Deducted Summary</td></tr>
              <tr><td colSpan={5} className={`${td} text-center`}>(Summary of Tax Payable and Tax Deducted Information)</td></tr>
              <tr>
                <td className={`${td} font-bold w-14`}>Sl. No.</td>
                <td colSpan={3} className={`${td} font-bold`}>Particulars</td>
                <td className={`${td} font-bold text-right w-32`}>Amount</td>
              </tr>
              <tr>
                <td className={td}>1</td>
                <td colSpan={3} className={td}>Tax Payable as per Part-B (SN 19)</td>
                <td className={`${td} text-right`}>{fmt(tax.taxPayable)}</td>
              </tr>
              <tr>
                <td className={td}>2</td>
                <td colSpan={3} className={td}>Tax Deducted at Current Employment</td>
                <td className={`${td} text-right`}>{fmt(tax.taxDeducted)}</td>
              </tr>
              <tr>
                <td className={td}>3</td>
                <td colSpan={3} className={td}>Tax Deducted at Previous Employment</td>
                <td className={`${td} text-right`}>Nil</td>
              </tr>
              <tr>
                <td className={td}>4</td>
                <td colSpan={3} className={td}>Total Tax Deducted (2+3)</td>
                <td className={`${td} text-right`}>{fmt(tax.taxDeducted)}</td>
              </tr>
              <tr>
                <td className={td}>5</td>
                <td colSpan={3} className={`${td} font-bold`}>Net Tax Payable / Refundable (1-4)</td>
                <td className={`${td} text-right font-bold`}>{fmt(tax.netTaxPayableOrRefund)}</td>
              </tr>
            </tbody>
          </table>

          <VerificationBlock data={data} editable={editable} onFieldChange={onFieldChange} closingText="PART_B" />

          <div className="mt-6 border-t border-black pt-2 text-right text-[11px] font-bold">Page 3 of 3</div>
        </section>
      </div>
    </div>
  );
}
