'use client';

import { useEffect, useState, useMemo } from 'react';
import { apiGet } from '@/lib/api-client';
import type { SalarySlip, PaginatedResponse } from '@/types';
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
      <div className="space-y-6 p-4 sm:p-6">
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
    <div className="space-y-6 p-4 sm:p-6">
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
                    <Button variant="outline" size="sm" disabled>
                      <Download className="h-3.5 w-3.5 mr-1" />
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
                            <Button variant="ghost" size="sm" disabled>
                              <Download className="h-3.5 w-3.5 mr-1" />
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedId === slip.id && (
                          <TableRow key={`${slip.id}-detail`}>
                            <TableCell colSpan={7} className="bg-muted/30 px-8 py-4">
                              <div className="grid grid-cols-2 gap-8">
                                <div>
                                  <p className="text-sm font-medium mb-3">Earnings</p>
                                  <div className="space-y-2">
                                    {getEarnings(slip).map((row) => (
                                      <div key={row.label} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{row.label}</span>
                                        <span>{row.value ? formatCurrency(row.value) : '—'}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                                      <span>Total Earnings</span>
                                      <span>{formatCurrency(slip.grossSalary)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium mb-3">Deductions</p>
                                  <div className="space-y-2">
                                    {getDeductions(slip).map((row) => (
                                      <div key={row.label} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{row.label}</span>
                                        <span className="text-red-600">{row.value ? formatCurrency(row.value) : '—'}</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                                      <span>Total Deductions</span>
                                      <span className="text-red-600">{formatCurrency(slip.totalDeduction)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
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