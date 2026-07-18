'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
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
import type { SalarySlip, PaginatedResponse } from '@/types';
import { useAuthStore } from '@/store/auth-store';

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
                    </TableRow>
                    {expandedId === slip.id && (
                      <TableRow key={`${slip.id}-detail`}>
                        <TableCell colSpan={7} className="bg-muted/30 px-6 py-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Basic Salary</p>
                              <p className="text-sm">{slip.basicSalary?.toLocaleString() || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">HRA</p>
                              <p className="text-sm">{slip.hra?.toLocaleString() || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">DA</p>
                              <p className="text-sm">{slip.da?.toLocaleString() || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Conveyance</p>
                              <p className="text-sm">{slip.conveyance?.toLocaleString() || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Medical</p>
                              <p className="text-sm">{slip.medical?.toLocaleString() || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Special Allowance</p>
                              <p className="text-sm">{slip.specialAllow?.toLocaleString() || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">PF</p>
                              <p className="text-sm">{slip.pf?.toLocaleString() || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">ESI</p>
                              <p className="text-sm">{slip.esi?.toLocaleString() || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">TDS</p>
                              <p className="text-sm">{slip.tds?.toLocaleString() || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Prof. Tax</p>
                              <p className="text-sm">{slip.professionalTax?.toLocaleString() || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Other Deduction</p>
                              <p className="text-sm">{slip.otherDeduction?.toLocaleString() || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Total Deduction</p>
                              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                {slip.totalDeduction?.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
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
                      <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
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