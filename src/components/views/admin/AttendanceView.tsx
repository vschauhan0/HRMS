'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth-store';
import { useNavStore } from '@/store/nav-store';
import { apiGet } from '@/lib/api-client';
import { PAGE_SIZE } from '@/lib/constants';
import type { PaginatedResponse, MonthlyAttendanceSummary, Company, Branch } from '@/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AttendanceView() {
  const { isSuperAdmin, user, selectedCompany: globalCompany, selectedBranch: globalBranch } = useAuthStore();
  const { navigate } = useNavStore();

  const [records, setRecords] = useState<MonthlyAttendanceSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  
  const currentDate = new Date();
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1));
  const [year, setYear] = useState(String(currentDate.getFullYear()));
  const [search, setSearch] = useState('');

  // Use global company/branch by default, but allow overriding if needed.
  // In this app, the global sidebar already handles Super Admin company/branch selection perfectly.
  const companyId = globalCompany?.id || '';
  const branchId = globalBranch?.id || '';

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      params.set('month', month);
      params.set('year', year);
      if (companyId) params.set('companyId', companyId);
      if (branchId) params.set('branchId', branchId);
      if (search) params.set('search', search);

      const res = await apiGet<PaginatedResponse<MonthlyAttendanceSummary>>(`/attendance/monthly?${params}`);
      setRecords(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page, month, year, companyId, branchId, search]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Monthly Attendance</h1>
        
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={month} onValueChange={(v) => { setMonth(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => {
                const monthNum = i + 1;
                const isFuture = parseInt(year) === currentYear && monthNum > currentMonth;
                return (
                  <SelectItem key={monthNum} value={String(monthNum)} disabled={isFuture}>
                    {m}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={(v) => { setYear(v); setPage(1); }}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search employee..." 
              className="pl-9 w-48 sm:w-64" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No attendance records found for this month.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Employee Name</TableHead>
                  {isSuperAdmin() && <TableHead className="hidden lg:table-cell">Company</TableHead>}
                  <TableHead className="hidden md:table-cell">Branch</TableHead>
                  <TableHead className="hidden xl:table-cell">Department</TableHead>
                  <TableHead className="text-center text-emerald-600 font-semibold">P</TableHead>
                  <TableHead className="text-center text-rose-600 font-semibold">A</TableHead>
                  <TableHead className="text-center text-blue-600 font-semibold">L</TableHead>
                  <TableHead className="text-center text-amber-600 font-semibold">Late</TableHead>
                  <TableHead className="text-center text-purple-600 font-semibold">Half</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.employeeId} className="group hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{r.employeeCode}</TableCell>
                    <TableCell className="font-medium">{r.firstName} {r.lastName}</TableCell>
                    {isSuperAdmin() && <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{r.company}</TableCell>}
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.branch}</TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">{r.department}</TableCell>
                    <TableCell className="text-center font-medium text-emerald-600">{r.present}</TableCell>
                    <TableCell className="text-center font-medium text-rose-600">{r.absent}</TableCell>
                    <TableCell className="text-center font-medium text-blue-600">{r.leave}</TableCell>
                    <TableCell className="text-center font-medium text-amber-600">{r.late}</TableCell>
                    <TableCell className="text-center font-medium text-purple-600">{r.halfDay}</TableCell>
                    <TableCell className="text-center font-medium">{r.totalWorkingDays}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate('attendance-details', { employeeId: r.employeeId, month, year })}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} &middot; {total} total employees
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}