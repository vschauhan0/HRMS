'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavStore } from '@/store/nav-store';
import { useAuthStore } from '@/store/auth-store';
import { apiGet, apiPatch } from '@/lib/api-client';
import { STATUS_COLORS, PAGE_SIZE } from '@/lib/constants';
import { toast } from 'sonner';
import type { AppointmentForm, PaginatedResponse } from '@/types';

export default function AppointmentListView() {
  const navigate = useNavStore();
  const { selectedCompany } = useAuthStore();

  const [appointments, setAppointments] = useState<AppointmentForm[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [statusTab, setStatusTab] = useState('ALL');
  const [page, setPage] = useState(1);

  // Approve dialog
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  // Reject dialog
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (statusTab !== 'ALL') params.set('status', statusTab);
      if (selectedCompany?.id) params.set('companyId', selectedCompany.id);

      const res = await apiGet<PaginatedResponse<AppointmentForm>>(
        `/appointments?${params.toString()}`
      );
      setAppointments(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [statusTab, page, selectedCompany]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  async function handleApprove() {
    if (!approveId) return;
    setApproving(true);
    try {
      await apiPatch(`/appointments/${approveId}/approve`);
      toast.success('Application approved');
      setApproveId(null);
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve');
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setRejecting(true);
    try {
      await apiPatch(`/appointments/${rejectId}/reject`, {
        reason: rejectReason,
      });
      toast.success('Application rejected');
      setRejectId(null);
      setRejectReason('');
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Appointment Applications
      </h1>

      {/* Filter tabs */}
      <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="rounded-xl border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No appointment applications found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden xl:table-cell">Mobile</TableHead>
                  <TableHead className="hidden lg:table-cell">Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-sm">
                      {app.applicationNo}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {app.fullName}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {app.email}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">
                      {app.mobile}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {app.company?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[app.status] || ''}
                      >
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(app.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            navigate('appointment-detail', { id: app.id })
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {app.status === 'PENDING' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                              onClick={() => setApproveId(app.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => setRejectId(app.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {appointments.map((app) => (
              <Card key={app.id} className="rounded-xl border shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{app.fullName}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {app.applicationNo}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[app.status] || ''}
                    >
                      {app.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Email</p>
                      <p className="truncate">{app.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Mobile</p>
                      <p>{app.mobile}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Company</p>
                      <p>{app.company?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p>{new Date(app.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 pt-1 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate('appointment-detail', { id: app.id })
                      }
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {app.status === 'PENDING' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600 hover:text-emerald-700"
                          onClick={() => setApproveId(app.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => setRejectId(app.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
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

      {/* Approve confirmation */}
      <AlertDialog open={!!approveId} onOpenChange={() => setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this appointment application?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={approving}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {approving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject with reason */}
      <Dialog open={!!rejectId} onOpenChange={() => { setRejectId(null); setRejectReason(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter reason for rejection..."
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { setRejectId(null); setRejectReason(''); }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
              >
                {rejecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}