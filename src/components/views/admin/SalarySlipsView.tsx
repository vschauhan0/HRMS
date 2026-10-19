'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Card, CardContent } from '@/components/ui/card';
import { apiGet } from '@/lib/api-client';
import { MONTHS, MONTHS_SHORT, PAGE_SIZE } from '@/lib/constants';
import { toast } from 'sonner';
import type { SalarySlip, PaginatedResponse } from '@/types';
import { useAuthStore } from '@/store/auth-store';
import { numberToWords } from '@/lib/utils';

export default function SalarySlipsView() {
  const { selectedCompany } = useAuthStore();
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSlips = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (monthFilter !== 'ALL') params.set('month', monthFilter);
      if (yearFilter !== 'ALL') params.set('year', yearFilter);
      if (selectedCompany?.id) params.set('companyId', selectedCompany.id);

      const res = await apiGet<PaginatedResponse<SalarySlip>>(
        `/salary/slips?${params.toString()}`
      );
      setSlips(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      setSlips([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, monthFilter, yearFilter, page, selectedCompany]);

  useEffect(() => {
    fetchSlips();
  }, [fetchSlips]);

  async function handleDownloadSlip(slip: SalarySlip) {
    if (downloadingId) return;
    setDownloadingId(slip.id);
    try {
      const { token } = useAuthStore.getState();
      const code = slip.employee?.employeeCode || 'unknown';
      const monthYear = `${MONTHS_SHORT[(slip.month || 1) - 1]}_${slip.year}`;
      const res = await fetch(`/api/v1/salary/slips/${slip.id}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to generate payslip');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${code}_${monthYear}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download payslip');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Salary Slips</h1>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employee..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={monthFilter}
          onValueChange={(v) => { setMonthFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Months</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={yearFilter}
          onValueChange={(v) => { setYearFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : slips.length === 0 ? (
        <Card className="rounded-xl border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No salary slips found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net Salary</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {slips.map((slip) => (
                  <Fragment key={slip.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedId(expandedId === slip.id ? null : slip.id)
                      }
                    >
                      <TableCell className="w-8">
                        {expandedId === slip.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {slip.employee?.employeeCode || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {slip.employee
                          ? `${slip.employee.firstName} ${slip.employee.lastName}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {MONTHS_SHORT[(slip.month || 1) - 1]}
                      </TableCell>
                      <TableCell className="text-sm">{slip.year}</TableCell>
                      <TableCell className="text-right text-sm">
                        {slip.grossSalary?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {slip.netSalary?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={downloadingId === slip.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSlip(slip);
                          }}
                        >
                          {downloadingId === slip.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileDown className="h-4 w-4" />
                          )}
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
                          <TableCell colSpan={8} className="bg-muted/20 px-4 py-6 sm:px-8 sm:py-8">
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
                                onClick={() => handleDownloadSlip(slip)}
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
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {slips.map((slip) => {
              const isExpanded = expandedId === slip.id;
              return (
                <Card key={slip.id} className="rounded-xl border shadow-sm">
                  <CardContent
                    className="p-4 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : slip.id)
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">
                        {slip.employee
                          ? `${slip.employee.firstName} ${slip.employee.lastName}`
                          : '-'}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={downloadingId === slip.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSlip(slip);
                          }}
                        >
                          {downloadingId === slip.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileDown className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {MONTHS_SHORT[(slip.month || 1) - 1]} {slip.year}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-mono text-xs">
                        {slip.employee?.employeeCode}
                      </span>
                      <span className="font-medium">
                        {slip.netSalary?.toLocaleString()}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Gross</p>
                            <p className="text-sm">{slip.grossSalary?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Deductions</p>
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {slip.totalDeduction?.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Basic</p>
                            <p className="text-sm">{slip.basicSalary?.toLocaleString() || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">HRA</p>
                            <p className="text-sm">{slip.hra?.toLocaleString() || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">PF</p>
                            <p className="text-sm">{slip.pf?.toLocaleString() || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">TDS</p>
                            <p className="text-sm">{slip.tds?.toLocaleString() || '-'}</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={downloadingId === slip.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSlip(slip);
                            }}
                          >
                            {downloadingId === slip.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FileDown className="h-4 w-4 mr-2" />
                            )}
                            Download Payslip
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}