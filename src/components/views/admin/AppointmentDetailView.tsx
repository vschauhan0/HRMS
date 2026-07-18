'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
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
import { useNavStore } from '@/store/nav-store';
import { useAuthStore } from '@/store/auth-store';
import { apiGet, apiPatch } from '@/lib/api-client';
import { STATUS_COLORS } from '@/lib/constants';
import { toast } from 'sonner';
import type { AppointmentForm } from '@/types';

export default function AppointmentDetailView() {
  const { getParam, navigate } = useNavStore();
  const appointmentId = getParam('id') as string;

  const [appointment, setAppointment] = useState<AppointmentForm | null>(null);
  const [loading, setLoading] = useState(true);

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!appointmentId) return;
      try {
        const res = await apiGet<AppointmentForm>(
          `/appointments/${appointmentId}`
        );
        setAppointment(res);
      } catch {
        toast.error('Failed to load application');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [appointmentId]);

  async function handleApprove() {
    if (!appointmentId) return;
    setActionLoading(true);
    try {
      await apiPatch(`/appointments/${appointmentId}/approve`);
      toast.success('Application approved successfully');
      setShowApproveDialog(false);
      setAppointment((prev) =>
        prev ? { ...prev, status: 'APPROVED' } : null
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!appointmentId || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await apiPatch(`/appointments/${appointmentId}/reject`, {
        reason: rejectReason,
      });
      toast.success('Application rejected');
      setShowRejectDialog(false);
      setRejectReason('');
      setAppointment((prev) =>
        prev
          ? { ...prev, status: 'REJECTED', rejectionReason: rejectReason }
          : null
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDownloadDocument() {
    if (!appointment?.documentPath) return;
    const { token } = useAuthStore.getState();
    try {
      const res = await fetch(`/api/v1/appointments/${appointmentId}/document`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `appointment_${appointment.applicationNo}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download document');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('appointments')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Application Not Found
          </h1>
        </div>
        <Card className="rounded-xl border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              This application could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('appointments')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          Appointment: {appointment.applicationNo}
        </h1>
      </div>

      {/* Details card */}
      <Card className="rounded-xl border shadow-sm">
        <CardContent className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{appointment.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{appointment.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mobile</p>
              <p className="font-medium">{appointment.mobile}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Company</p>
              <p className="font-medium">{appointment.company?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Branch</p>
              <p className="font-medium">{appointment.branch?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge
                variant="secondary"
                className={STATUS_COLORS[appointment.status] || ''}
              >
                {appointment.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted Date</p>
              <p className="font-medium">
                {new Date(appointment.submittedAt).toLocaleDateString()}
              </p>
            </div>
            {appointment.rejectionReason && (
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Rejection Reason</p>
                <p className="font-medium text-red-600 dark:text-red-400">
                  {appointment.rejectionReason}
                </p>
              </div>
            )}
          </div>

          {/* Document download */}
          {appointment.documentPath && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadDocument}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download Document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {appointment.status === 'PENDING' && (
        <div className="flex items-center gap-3">
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => setShowApproveDialog(true)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Approve
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowRejectDialog(true)}
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Reject
          </Button>
        </div>
      )}

      {/* Approve dialog */}
      <AlertDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the appointment application from{' '}
              {appointment.fullName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {actionLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <Dialog open={showRejectDialog} onOpenChange={(open) => {
        if (!open) {
          setShowRejectDialog(false);
          setRejectReason('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="detail-reject-reason">Rejection Reason</Label>
              <Textarea
                id="detail-reject-reason"
                placeholder="Enter reason for rejection..."
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}