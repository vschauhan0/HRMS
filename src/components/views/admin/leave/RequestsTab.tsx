'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavStore } from '@/store/nav-store';
import { useAuthStore } from '@/store/auth-store';
import { apiGet, apiPatch } from '@/lib/api-client';
import { STATUS_COLORS, PAGE_SIZE } from '@/lib/constants';
import { toast } from 'sonner';
import type { LeaveRequest, PaginatedResponse } from '@/types';

export function RequestsTab() {
  const { navigate } = useNavStore();
  const { selectedCompany } = useAuthStore();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (statusTab !== 'ALL') params.set('status', statusTab);
      if (selectedCompany?.id) params.set('companyId', selectedCompany.id);
      const res = await apiGet<PaginatedResponse<LeaveRequest>>(`/leaves?${params}`);
      setLeaves(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch { setLeaves([]); } finally { setLoading(false); }
  }, [statusTab, page, selectedCompany]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  async function handleApprove() {
    if (!approveId) return; setActionLoading(true);
    try { await apiPatch(`/leaves/${approveId}/approve`); toast.success('Leave approved'); setApproveId(null); fetchLeaves(); }
    catch (err: any) { toast.error(err.message || 'Failed'); } finally { setActionLoading(false); }
  }

  async function handleReject() {
    if (!rejectId || !rejectReason.trim()) { toast.error('Please provide a reason'); return; }
    setActionLoading(true);
    try { await apiPatch(`/leaves/${rejectId}/reject`, { reason: rejectReason }); toast.success('Leave rejected'); setRejectId(null); setRejectReason(''); fetchLeaves(); }
    catch (err: any) { toast.error(err.message || 'Failed'); } finally { setActionLoading(false); }
  }

  function getDateRange(from: string, to: string) {
    const f = new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const t = new Date(to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${f} - ${t}`;
  }

  function getLeaveTypeColor(type: any) {
    if (type?.isPaid) return 'text-emerald-500';
    return 'text-blue-500';
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Leave Management</h1>

      <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v); setPage(1); }}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
          <TabsTrigger value="ALL">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : leaves.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No leave requests found.</CardContent></Card>
      ) : (
        <>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Dates</TableHead>
                  <TableHead className="hidden lg:table-cell">Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{l.employee?.firstName} {l.employee?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{l.employee?.employeeCode}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className={`font-medium text-sm ${getLeaveTypeColor(l.leaveType)}`}>{l.leaveType?.name || l.leaveTypeString || 'Leave'}</span>
                      {l.halfDay && <Badge variant="outline" className="ml-2 text-[10px]">Half Day</Badge>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{getDateRange(l.fromDate, l.toDate)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{l.reason}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_COLORS[l.status] || ''}>{l.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => setApproveId(l.id)}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setRejectId(l.id)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} &middot; {total} total</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!approveId} onOpenChange={() => setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Approve Leave</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to approve this leave request?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={actionLoading} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!rejectId} onOpenChange={() => { setRejectId(null); setRejectReason(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reject Leave</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Rejection Reason</Label>
              <Textarea placeholder="Enter reason..." rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(''); }}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}