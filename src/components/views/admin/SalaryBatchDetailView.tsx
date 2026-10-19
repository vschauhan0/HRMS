'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Loader2, FileDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNavStore } from '@/store/nav-store';
import { useAuthStore } from '@/store/auth-store';
import { apiGet, apiPost, apiDelete } from '@/lib/api-client';
import { MONTHS_SHORT } from '@/lib/constants';
import { toast } from 'sonner';
import type { SalaryBatch, SalarySlip } from '@/types';

export default function SalaryBatchDetailView() {
  const { getParam, navigate } = useNavStore();
  const batchId = getParam('id') as string;

  const [batch, setBatch] = useState<SalaryBatch | null>(null);
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchData = useCallback(async () => {
    if (!batchId) return;
    try {
      const res = await apiGet<any>(
        `/salary/batches/${batchId}`
      );
      setBatch(res);
      setSlips(res.salarySlips || []);
    } catch {
      toast.error('Failed to load batch details');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiDelete(`/salary/batches/${batchId}`);
      toast.success('Batch deleted successfully');
      navigate('salary');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete batch');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  async function handleGenerateAll() {
    setGenerating(true);
    try {
      await apiPost(`/salary/batches/${batchId}/generate-all`, {});
      toast.success('Payslips generated successfully');
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate payslips');
    } finally {
      setGenerating(false);
    }
  }

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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('salary')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Batch Not Found</h1>
        </div>
        <Card className="rounded-xl border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">This salary batch could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('salary')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Salary Batch Details</h1>
      </div>

      {/* Batch info */}
      <Card className="rounded-xl border shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{batch.company?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Branch</p>
              <p className="font-medium">{batch.branch?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Month/Year</p>
              <p className="font-medium">
                {MONTHS_SHORT[(batch.month || 1) - 1]} {batch.year}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="font-medium">{batch.importedRecords}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upload Date</p>
              <p className="font-medium">
                {new Date(batch.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slips table */}
      {slips.length === 0 ? (
        <Card className="rounded-xl border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No salary slips found in this batch.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="hidden md:block rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Gross Salary</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Salary</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {slips.map((slip) => (
                  <TableRow key={slip.id}>
                    <TableCell className="font-mono text-sm">
                      {slip.employee?.employeeCode || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {slip.employee
                        ? `${slip.employee.firstName} ${slip.employee.lastName}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {slip.grossSalary?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm text-red-600 dark:text-red-400">
                      {slip.totalDeduction?.toLocaleString()}
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
                        onClick={() => handleDownloadSlip(slip)}
                      >
                        {downloadingId === slip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {slips.map((slip) => (
              <Card key={slip.id} className="rounded-xl border shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {slip.employee
                        ? `${slip.employee.firstName} ${slip.employee.lastName}`
                        : '-'}
                    </p>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-muted-foreground font-mono mr-2">
                        {slip.employee?.employeeCode}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={downloadingId === slip.id}
                        onClick={() => handleDownloadSlip(slip)}
                      >
                        {downloadingId === slip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Gross</p>
                      <p>{slip.grossSalary?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Deductions</p>
                      <p className="text-red-600 dark:text-red-400">
                        {slip.totalDeduction?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Net</p>
                      <p className="font-medium">{slip.netSalary?.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <Button
          size="sm"
          onClick={handleGenerateAll}
          disabled={generating || slips.length === 0}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1.5" />
          )}
          Generate Payslips
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Delete Batch
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Salary Batch</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this salary batch and all associated
              salary slips. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}