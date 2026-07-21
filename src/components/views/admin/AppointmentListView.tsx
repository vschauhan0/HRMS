'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Eye, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Loader2,
  Plus, Users, Clock, CheckCircle, XCircle as XCircleIcon,
  ClipboardList, Building2,
} from 'lucide-react';
import { motion } from 'framer-motion';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { AppointmentForm } from '@/types';

const statCardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, type: 'spring', stiffness: 300, damping: 24 },
  }),
};

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

  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (statusTab !== 'ALL') params.set('status', statusTab);
      if (selectedCompany?.id) params.set('companyId', selectedCompany.id);

      const res = await apiGet<any>(
        `/appointments?${params.toString()}`
      );
      const appointments = Array.isArray(res) ? res : (res?.data || []);
      setAppointments(appointments);
      setTotal(res?.total || (Array.isArray(res) ? res.length : 0));
      setTotalPages(res?.totalPages || 1);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [statusTab, page, selectedCompany]);

  // Fetch stats (without status filter)
  const fetchStats = useCallback(async () => {
    try {
      const { token } = useAuthStore.getState();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const base = '/api/v1/appointments';

      const getCount = async (status?: string) => {
        const params = new URLSearchParams({ page: '1', pageSize: '1' });
        if (selectedCompany?.id) params.set('companyId', selectedCompany.id);
        if (status) params.set('status', status);
        const res = await fetch(`${base}?${params}`, { headers });
        const json = await res.json();
        return json.total || 0;
      };

      const [total, pending, approved, rejected] = await Promise.all([
        getCount(),
        getCount('PENDING'),
        getCount('APPROVED'),
        getCount('REJECTED'),
      ]);
      setStats({ total, pending, approved, rejected });
    } catch {
      // stats fetch failed, not critical
    }
  }, [selectedCompany]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function handleApprove() {
    if (!approveId) return;
    setApproving(true);
    try {
      await apiPatch(`/appointments/${approveId}/approve`);
      toast.success('Application approved');
      setApproveId(null);
      fetchAppointments();
      fetchStats();
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
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  }

  const statCards = [
    { label: 'Total Applications', value: stats.total, icon: ClipboardList, color: 'text-foreground', bg: 'bg-muted' },
    { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Rejected', value: stats.rejected, icon: XCircleIcon, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Appointment <span className="text-muted-foreground font-normal">&</span> Employment
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and manage appointment applications across your organization.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={statCardVariants}
            initial="hidden"
            animate="show"
          >
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-medium">{stat.label}</p>
                  <p className="text-xl font-bold tracking-tight">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filter tabs */}
      <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v); setPage(1); }}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="ALL" className="text-xs sm:text-sm">All</TabsTrigger>
          <TabsTrigger value="PENDING" className="text-xs sm:text-sm">
            Pending {stats.pending > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="APPROVED" className="text-xs sm:text-sm">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED" className="text-xs sm:text-sm">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="rounded-xl border border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Users className="text-muted-foreground h-6 w-6" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">No applications found</p>
              <p className="text-muted-foreground text-xs mt-1">
                {statusTab !== 'ALL'
                  ? `No ${statusTab.toLowerCase()} applications to display.`
                  : 'Appointment applications submitted from the login page will appear here.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Application No</TableHead>
                  <TableHead className="font-semibold">Applicant</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Contact</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Company</TableHead>
                  <TableHead className="font-semibold hidden xl:table-cell">Branch</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Submitted</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((app, i) => (
                  <TableRow
                    key={app.id}
                    className="group transition-colors hover:bg-muted/20"
                  >
                    <TableCell className="font-mono text-xs font-medium">
                      {app.applicationNo}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{app.fullName}</p>
                        {app.branch?.name && (
                          <p className="text-muted-foreground text-xs xl:hidden">{app.company?.name} · {app.branch.name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="space-y-0.5">
                        <p className="text-sm text-muted-foreground">{app.email}</p>
                        <p className="text-xs text-muted-foreground">{app.mobile}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="text-muted-foreground h-3.5 w-3.5" />
                        <span className="text-sm">{app.company?.name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      {app.branch?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`${STATUS_COLORS[app.status] || ''} text-[11px] font-semibold`}
                      >
                        {app.status === 'PENDING' && <Clock className="mr-1 h-3 w-3" />}
                        {app.status === 'APPROVED' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {app.status === 'REJECTED' && <XCircle className="mr-1 h-3 w-3" />}
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {new Date(app.submittedAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
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
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              onClick={() => setApproveId(app.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
              <Card key={app.id} className="rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{app.fullName}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {app.applicationNo}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`shrink-0 ${STATUS_COLORS[app.status] || ''} text-[10px] font-semibold`}
                    >
                      {app.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Email</p>
                      <p className="truncate text-xs">{app.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Mobile</p>
                      <p className="text-xs">{app.mobile}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Company</p>
                      <p className="text-xs">{app.company?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Branch</p>
                      <p className="text-xs">{app.branch?.name || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Submitted</p>
                      <p className="text-xs">
                        {new Date(app.submittedAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        navigate('appointment-detail', { id: app.id })
                      }
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    {app.status === 'PENDING' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          onClick={() => setApproveId(app.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => setRejectId(app.id)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
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
                  className="h-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
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