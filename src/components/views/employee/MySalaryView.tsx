'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiGet } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import type { SalarySlip, PaginatedResponse } from '@/types';
import { numberToWords } from '@/lib/utils';
import { MONTHS_SHORT } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  ChevronDown,
  ChevronUp,
  Receipt,
  DollarSign,
  MinusCircle,
  Loader2,
  FileDown,
} from 'lucide-react';

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

interface EarningsRow {
  label: string;
  value: number | null;
}

interface DeductionRow {
  label: string;
  value: number | null;
}

export default function MySalaryView() {
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSlips() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('pageSize', '100');
        if (selectedYear !== 'all') params.set('year', selectedYear);
        const res = await apiGet<PaginatedResponse<SalarySlip>>(`/salary/slips?${params.toString()}`);
        setSlips(res.data || []);
      } catch {
        setSlips([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSlips();
  }, [selectedYear]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    slips.forEach((s) => years.add(s.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [slips]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownloadPayslip(slip: SalarySlip) {
    setDownloadingId(slip.id);
    try {
      const { token } = useAuthStore.getState();
      const res = await fetch(`/api/v1/salary/slips/${slip.id}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to generate payslip');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${slip.employee?.employeeCode || 'slip'}_${MONTHS[slip.month]}_${slip.year}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download payslip');
    } finally {
      setDownloadingId(null);
    }
  }

  const getEarnings = (slip: SalarySlip): EarningsRow[] => [
    { label: 'Basic Salary', value: slip.basicSalary },
    { label: 'HRA', value: slip.hra },
    { label: 'DA', value: slip.da },
    { label: 'Conveyance', value: slip.conveyance },
    { label: 'Medical Allowance', value: slip.medical },
    { label: 'Special Allowance', value: slip.specialAllow },
  ];

  const getDeductions = (slip: SalarySlip): DeductionRow[] => [
    { label: 'PF', value: slip.pf },
    { label: 'ESI', value: slip.esi },
    { label: 'TDS', value: slip.tds },
    { label: 'Professional Tax', value: slip.professionalTax },
    { label: 'Other Deduction', value: slip.otherDeduction },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My Salary Slips</h1>
        {availableYears.length > 0 && (
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Empty State */}
      {slips.length === 0 ? (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="py-16">
            <div className="text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No salary slips available yet.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="block sm:hidden space-y-4">
            {slips.map((slip) => (
              <Card key={slip.id} className="rounded-xl shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {MONTHS[slip.month]} {slip.year}
                      </p>
                      {slip.employee?.company && (
                        <p className="text-xs text-muted-foreground">
                          {slip.employee.company.name}
                          {slip.employee.branch ? ` · ${slip.employee.branch.name}` : ''}
                        </p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadPayslip(slip); }} disabled={downloadingId === slip.id}>
                      <Download className={`h-3.5 w-3.5 mr-1 ${downloadingId === slip.id ? 'animate-pulse' : ''}`} />
                      PDF
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Gross</p>
                      <p className="text-sm font-medium">{formatCurrency(slip.grossSalary)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Deductions</p>
                      <p className="text-sm font-medium text-red-600">
                        {formatCurrency(slip.totalDeduction)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Net</p>
                      <p className="text-sm font-semibold">{formatCurrency(slip.netSalary)}</p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => toggleExpand(slip.id)}
                  >
                    {expandedId === slip.id ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5 mr-1" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5 mr-1" />
                        View Details
                      </>
                    )}
                  </Button>

                  {expandedId === slip.id && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> Earnings
                        </p>
                        <div className="space-y-1.5">
                          {getEarnings(slip).map((row) => (
                            <div key={row.label} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{row.label}</span>
                              <span>{row.value ? formatCurrency(row.value) : '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <MinusCircle className="h-3 w-3" /> Deductions
                        </p>
                        <div className="space-y-1.5">
                          {getDeductions(slip).map((row) => (
                            <div key={row.label} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{row.label}</span>
                              <span className="text-red-600">{row.value ? formatCurrency(row.value) : '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden sm:block">
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month / Year</TableHead>
                      <TableHead className="text-right">Gross Salary</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Salary</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slips.map((slip) => (
                      <>
                        <TableRow key={slip.id} className="cursor-pointer" onClick={() => toggleExpand(slip.id)}>
                          <TableCell className="font-medium">
                            {MONTHS[slip.month]} {slip.year}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(slip.grossSalary)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(slip.totalDeduction)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(slip.netSalary)}</TableCell>
                          <TableCell>{slip.employee?.company?.name || '—'}</TableCell>
                          <TableCell>{slip.employee?.branch?.name || '—'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDownloadPayslip(slip); }} disabled={downloadingId === slip.id}>
                              <Download className={`h-3.5 w-3.5 mr-1 ${downloadingId === slip.id ? 'animate-pulse' : ''}`} />
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedId === slip.id && (() => {
                          const company = slip.employee?.company;
                          const branch = slip.employee?.branch;
                          const emp = slip.employee;
                          const mmStr = String(slip.month).padStart(2, '0');
                          const lastDay = new Date(slip.year, slip.month, 0).getDate();
                          const fromDate = `01/${mmStr}/${slip.year}`;
                          const toDate = `${lastDay}/${mmStr}/${slip.year}`;
                          const isNidhi = company?.name?.toLowerCase().includes('nidhi');
                          const logoSrc = isNidhi ? '/nidhi_impex_logo.png' : '/silver_star_logo.png';

                          return (
                            <TableRow key={`${slip.id}-detail`}>
                              <TableCell colSpan={7} className="bg-muted/20 px-4 py-6 sm:px-8 sm:py-8">
                                <div className="overflow-x-auto bg-neutral-300 px-3 py-4 sm:px-6 sm:py-6 rounded-xl">
                                  <div style={{ display: 'inline-block', width: '100%' }}>
                                    <article className="mx-auto w-full min-w-[680px] max-w-[960px] bg-white text-black shadow-[0_20px_50px_rgba(15,23,42,0.14)]" style={{ fontFamily: 'Arial, sans-serif' }}>
                                      <div className="border-[2px] border-black px-5 py-5 sm:px-7 sm:py-7">
                                        <header className="grid grid-cols-[96px_1fr_96px] items-center gap-2 border-b-[2px] border-black pb-4">
                                          <div className="flex h-[78px] items-center justify-start overflow-hidden">
                                            <img alt={`${company?.name || 'Company'} logo`} className="block h-[76px] w-[76px] object-contain" loading="eager" src={logoSrc} />
                                          </div>
                                          <div className="text-center min-w-0">
                                            <h1 className="text-[15px] font-extrabold uppercase leading-tight sm:text-[18px]">{company?.name || 'COMPANY NAME'}</h1>
                                            <p className="text-[9px] font-bold leading-snug sm:text-[11px] uppercase break-words whitespace-normal px-2">{company?.address || '-'}</p>
                                            <p className="mt-2 text-[14px] font-extrabold sm:text-[16px]">Pay Slip For the Month of {MONTHS_SHORT[slip.month - 1]}-{slip.year}</p>
                                            <p className="text-[12px] font-extrabold">(From {fromDate} To {toDate})</p>
                                          </div>
                                          <div></div>
                                        </header>

                                        <section className="mt-4 border-[2px] border-black">
                                          <table className="w-full border-collapse text-[12px] leading-tight sm:text-[13px]">
                                            <tbody>
                                              <tr>
                                                <td className="w-[18%] px-1.5 pt-1 align-top font-normal">Employee Name</td>
                                                <td className="w-[32%] px-1.5 pt-1 align-top font-bold">: {emp ? `${emp.firstName} ${emp.lastName}` : '-'}</td>
                                                <td className="w-[18%] px-1.5 pt-1 align-top font-normal">Employee Code</td>
                                                <td className="w-[32%] px-1.5 pt-1 align-top font-bold">: {emp?.employeeCode || '-'}</td>
                                              </tr>
                                              <tr>
                                                <td className="px-1.5 align-top">Bank A/c No.</td>
                                                <td className="px-1.5 align-top font-bold">: {(emp as any)?.bankDetail?.accountNumber || '-'}</td>
                                                <td className="px-1.5 align-top">Bank Name</td>
                                                <td className="px-1.5 align-top font-bold">: {(emp as any)?.bankDetail?.bankName || '-'}</td>
                                              </tr>
                                              <tr>
                                                <td className="px-1.5 align-top">UAN</td>
                                                <td className="px-1.5 align-top font-bold">: {emp?.uan || '-'}</td>
                                                <td className="px-1.5 align-top">Mobile</td>
                                                <td className="px-1.5 align-top font-bold">: {emp?.mobile || '-'}</td>
                                              </tr>
                                              <tr>
                                                <td className="px-1.5 pb-2 align-top">Designation</td>
                                                <td className="px-1.5 pb-2 align-top font-bold uppercase">: {emp?.designation || '-'}</td>
                                                <td className="px-1.5 pb-2 align-top">Unit</td>
                                                <td className="px-1.5 pb-2 align-top font-bold uppercase">: {branch?.name || '-'}</td>
                                              </tr>
                                            </tbody>
                                          </table>

                                          <div className="grid grid-cols-2 border-t-[2px] border-black text-[12px] font-bold sm:text-[13px]">
                                            <div className="grid grid-cols-[1fr_auto] border-r-[2px] border-black px-1.5 py-1">
                                              <span>Total Paid Days</span>
                                              <span>: {slip.workingDays || 30}</span>
                                            </div>
                                            <div className="grid grid-cols-[1fr_auto] px-1.5 py-1">
                                              <span>LWP</span>
                                              <span>: {slip.lwp || 0}</span>
                                            </div>
                                            <div className="grid grid-cols-[1fr_auto] border-r-[2px] border-black px-1.5 py-1">
                                              <span>Net Paid Days</span>
                                              <span>: {(slip.workingDays || 30) - (slip.lwp || 0)}</span>
                                            </div>
                                            <div className="px-1.5 py-1"></div>
                                          </div>
                                        </section>

                                        <section className="mt-4 border-[2px] border-black">
                                          <table className="w-full border-collapse text-[11px] leading-tight sm:text-[13px]">
                                            <thead>
                                              <tr className="font-extrabold border-b-[2px] border-black">
                                                <th className="border-r-[2px] border-black px-1.5 py-1 text-left">Earnings</th>
                                                <th className="border-r-[2px] border-black px-1.5 py-1 text-right">Scale Rs.</th>
                                                <th className="border-r-[2px] border-black px-1.5 py-1 text-right">Amount Rs.</th>
                                                <th className="border-r-[2px] border-black px-1.5 py-1 text-left">Deductions</th>
                                                <th className="border-r-[2px] border-black px-1.5 py-1 text-right">Scale Rs.</th>
                                                <th className="px-1.5 py-1 text-right">Amount Rs.</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              <tr>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">BASIC</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">{slip.basicSalary?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">{slip.basicSalary?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">PROFESSIONAL TAX</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">0.00</td>
                                                <td className="px-1.5 py-1 text-right">{slip.professionalTax?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                              </tr>
                                              <tr>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">DAILY ALLOWANCE</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">{slip.da?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">{slip.da?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">PF</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">0.00</td>
                                                <td className="px-1.5 py-1 text-right">{slip.pf?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                              </tr>
                                              <tr>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">HRA</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">{slip.hra?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">{slip.hra?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">ESI AMOUNT</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">0.00</td>
                                                <td className="px-1.5 py-1 text-right">{slip.esi?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                              </tr>
                                              <tr>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">Conv.A</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">{slip.conveyance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">{slip.conveyance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">TDS</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">0.00</td>
                                                <td className="px-1.5 py-1 text-right">{slip.tds?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                              </tr>
                                              <tr>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">Edu.A</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">{slip.medical?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">{slip.medical?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">LWF</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">0.00</td>
                                                <td className="px-1.5 py-1 text-right">{slip.lwf?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                              </tr>
                                              <tr>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">Med.A</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">0.00</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">0.00</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">ADVANCE</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">0.00</td>
                                                <td className="px-1.5 py-1 text-right">{slip.advance?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                              </tr>
                                              <tr>
                                                <td className="border-r-[2px] border-black px-1.5 py-1">Prod. Ince.</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">{slip.specialAllow?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right">{slip.specialAllow?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1"></td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1 text-right"></td>
                                                <td className="px-1.5 py-1 text-right">{slip.otherDeduction?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || ''}</td>
                                              </tr>
                                            </tbody>
                                            <tfoot>
                                              <tr className="border-t-[2px] border-black text-[12px] font-extrabold sm:text-[13px]">
                                                <td className="border-r-[2px] border-black px-1.5 py-1.5">Total Earnings</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1.5 text-right">{slip.grossSalary?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1.5 text-right">{slip.grossSalary?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1.5">Total Deductions</td>
                                                <td className="border-r-[2px] border-black px-1.5 py-1.5 text-right">{slip.totalDeduction?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-1.5 py-1.5 text-right">{slip.totalDeduction?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                              </tr>
                                            </tfoot>
                                          </table>
                                        </section>

                                        <section className="border-x-[2px] border-b-[2px] border-black text-[12px] sm:text-[13px]">
                                          <div className="grid grid-cols-[82px_1fr] border-b border-black bg-neutral-50 px-1.5 py-1.5 font-extrabold">
                                            <span>Net Pay</span>
                                            <span className="font-semibold">: Rs. {slip.netSalary?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                          </div>
                                          <div className="grid grid-cols-[82px_1fr] px-1.5 py-1.5 font-extrabold">
                                            <span>In Words</span>
                                            <span className="font-normal">: Rs. {numberToWords(slip.netSalary)}</span>
                                          </div>
                                        </section>

                                        <section className="mt-4 border-[2px] border-black text-[12px] sm:text-[13px]">
                                          <div className="border-b-[2px] border-black bg-neutral-50 px-1.5 py-1 font-extrabold">Miscellaneous Information</div>
                                          <div className="grid grid-cols-[1fr_180px] border-b border-black">
                                            <div className="px-1.5 py-1">SALARY</div>
                                            <div className="border-l-[2px] border-black px-1.5 py-1 text-right font-bold">{(slip.salary || slip.grossSalary)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                          </div>
                                          <div className="min-h-[120px] px-1.5 py-3 relative">
                                            <p className="italic">TDS Deducted Upto {MONTHS_SHORT[slip.month - 1]}-{slip.year}: Rs. {slip.tds ? slip.tds.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : 'Nil'}</p>
                                            <p className="font-extrabold">This is Computer Generated Sheet, does not require Signature.</p>
                                            <div className="mt-16 flex items-end justify-between gap-4">
                                              <div className="text-[11px] font-bold text-neutral-600">Paid On: -</div>
                                              <div className="text-right">
                                                <p className="text-[14px] font-extrabold uppercase">{company?.name || '-'}</p>
                                              </div>
                                            </div>
                                          </div>
                                        </section>
                                      </div>
                                    </article>
                                  </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={downloadingId === slip.id}
                                    onClick={() => handleDownloadPayslip(slip)}
                                  >
                                    {downloadingId === slip.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <FileDown className="h-4 w-4 mr-2" />
                                    )}
                                    Download Payslip
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })()}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}