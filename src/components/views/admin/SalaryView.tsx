'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useNavStore } from '@/store/nav-store';
import { useAuthStore } from '@/store/auth-store';
import { apiGet } from '@/lib/api-client';
import { MONTHS, MONTHS_SHORT, PAGE_SIZE } from '@/lib/constants';
import type { SalaryBatch, Branch, PaginatedResponse } from '@/types';

export default function SalaryView() {
  const navigate = useNavStore();
  const { selectedCompany } = useAuthStore();

  const [batches, setBatches] = useState<SalaryBatch[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const [branches, setBranches] = useState<Branch[]>([]);

  // Generate year options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  // Fetch branches
  useEffect(() => {
    async function fetchBranches() {
      if (!selectedCompany?.id) {
        setBranches([]);
        return;
      }
      try {
        const res = await apiGet<Branch[]>(
          `/branches?companyId=${selectedCompany.id}&pageSize=100`
        );
        setBranches(Array.isArray(res) ? res : (res as any)?.data || []);
      } catch {
        setBranches([]);
      }
    }
    fetchBranches();
  }, [selectedCompany]);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (selectedCompany?.id) params.set('companyId', selectedCompany.id);
      if (branchFilter !== 'ALL') params.set('branchId', branchFilter);
      if (monthFilter !== 'ALL') params.set('month', monthFilter);
      if (yearFilter !== 'ALL') params.set('year', yearFilter);

      const res = await apiGet<PaginatedResponse<SalaryBatch>>(
        `/salary/batches?${params.toString()}`
      );
      setBatches(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [branchFilter, monthFilter, yearFilter, page, selectedCompany]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Salary Management</h1>
        <Button size="sm" onClick={() => navigate('salary-upload')}>
          <Plus className="h-4 w-4 mr-1.5" />
          Upload Salary
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">

        <Select
          value={branchFilter}
          onValueChange={(v) => { setBranchFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
      ) : batches.length === 0 ? (
        <Card className="rounded-xl border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No salary batches uploaded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Month/Year</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="hidden lg:table-cell">Uploaded By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow
                    key={batch.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate('salary-batch-detail', { id: batch.id })}
                  >
                    <TableCell className="text-sm font-medium">
                      {batch.company?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {batch.branch?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {MONTHS_SHORT[(batch.month || 1) - 1]} {batch.year}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {batch.importedRecords}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {batch.uploadedBy || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {batches.map((batch) => (
              <Card
                key={batch.id}
                className="rounded-xl border shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate('salary-batch-detail', { id: batch.id })}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {batch.company?.name || '-'} · {batch.branch?.name || '-'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {MONTHS_SHORT[(batch.month || 1) - 1]} {batch.year}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{batch.importedRecords} records</span>
                    <span>{new Date(batch.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
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