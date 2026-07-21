'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Download, Loader2, User, MapPin, Briefcase, Phone, Building2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavStore } from '@/store/nav-store';
import { useAuthStore } from '@/store/auth-store';
import { apiGet, apiPatch } from '@/lib/api-client';
import { STATUS_COLORS } from '@/lib/constants';
import { toast } from 'sonner';
import type { AppointmentForm, FamilyMember } from '@/types';

const Field = ({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) => (
  <div>
    <p className="text-muted-foreground text-xs font-medium flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5" />}{label}
    </p>
    <p className="font-medium text-sm mt-0.5">{value || '-'}</p>
  </div>
);

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
      try { const res = await apiGet<AppointmentForm>(`/appointments/${appointmentId}`); setAppointment(res); }
      catch { toast.error('Failed to load application'); } finally { setLoading(false); }
    }
    fetchData();
  }, [appointmentId]);

  async function handleApprove() {
    if (!appointmentId) return; setActionLoading(true);
    try { await apiPatch(`/appointments/${appointmentId}/approve`); toast.success('Approved'); setShowApproveDialog(false); setAppointment((p) => p ? { ...p, status: 'APPROVED' } : null); }
    catch (err: any) { toast.error(err.message || 'Failed'); } finally { setActionLoading(false); }
  }

  async function handleReject() {
    if (!appointmentId || !rejectReason.trim()) return; setActionLoading(true);
    try { await apiPatch(`/appointments/${appointmentId}/reject`, { reason: rejectReason }); toast.success('Rejected'); setShowRejectDialog(false); setRejectReason(''); setAppointment((p) => p ? { ...p, status: 'REJECTED', rejectionReason } : null); }
    catch (err: any) { toast.error(err.message || 'Failed'); } finally { setActionLoading(false); }
  }

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 rounded-xl" /></div>;
  if (!appointment) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('appointments')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-semibold">Application Not Found</h1>
      </div>
    </div>
  );

  const getName = () => appointment.firstName ? [appointment.firstName, appointment.middleName, appointment.surname].filter(Boolean).join(' ') : (appointment.fullName || '-');
  const getFamilyMembers = (): FamilyMember[] => {
    if (!appointment.familyMembers) return [];
    try { return JSON.parse(appointment.familyMembers); } catch { return []; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('appointments')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{getName()}</h1>
          <p className="text-sm text-muted-foreground font-mono">{appointment.applicationNo}</p>
        </div>
        <Badge variant="secondary" className={`${STATUS_COLORS[appointment.status] || ''} text-xs font-semibold`}>{appointment.status}</Badge>
      </div>

      {/* Photo + Basic Info */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-4 flex flex-col items-center">
            {appointment.photoPath ? (
              <img src={`/${appointment.photoPath}`} alt="Photo" className="w-32 h-40 rounded-lg object-cover border" />
            ) : (
              <div className="w-32 h-40 rounded-lg bg-muted flex items-center justify-center border border-dashed"><User className="h-12 w-12 text-muted-foreground/40" /></div>
            )}
            {appointment.employeeCode && <p className="text-xs text-muted-foreground mt-2 font-mono">{appointment.employeeCode}</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Employment Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Department" value={appointment.department} icon={Briefcase} />
            <Field label="Designation" value={appointment.designation} />
            <Field label="Manager" value={appointment.managerName} />
            <Field label="Salary" value={appointment.salary ? `₹${appointment.salary.toLocaleString('en-IN')}` : undefined} />
            <Field label="Joining Date" value={appointment.joiningDate ? new Date(appointment.joiningDate).toLocaleDateString('en-IN') : undefined} />
            <Field label="Punching No" value={appointment.punchingNo} />
            <Field label="Company" value={appointment.company?.name} icon={Building2} />
            <Field label="Branch" value={appointment.branch?.name} />
          </CardContent>
        </Card>
      </div>

      {/* Contact & Personal */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Personal & Contact Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Email" value={appointment.email} icon={Phone} />
          <Field label="Mobile" value={appointment.mobile} icon={Phone} />
          <Field label="WhatsApp" value={appointment.whatsappNo} icon={Phone} />
          <Field label="Address" value={appointment.address} icon={MapPin} />
          <Field label="Village" value={appointment.village} />
          <Field label="Taluka" value={appointment.taluka} />
          <Field label="District" value={appointment.district} />
          <Field label="Date of Birth" value={appointment.dob ? new Date(appointment.dob).toLocaleDateString('en-IN') : undefined} />
          <Field label="Birth Place" value={appointment.birthPlace} />
          <Field label="Gender" value={appointment.gender} />
          <Field label="Marital Status" value={appointment.maritalStatus} />
          <Field label="Blood Group" value={appointment.bloodGroup} />
          <Field label="Education" value={appointment.education} />
        </CardContent>
      </Card>

      {/* Bank & Documents */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Bank & Document Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Aadhar No" value={appointment.aadharNumber} />
          <Field label="PAN No" value={appointment.panNumber} />
          <Field label="Bank Name" value={appointment.bankName} icon={CreditCard} />
          <Field label="Bank Account" value={appointment.bankAccountNo} />
          <Field label="IFSC Code" value={appointment.bankIfsc} />
          <Field label="Reference Name" value={appointment.referenceName} />
          <Field label="Reference Mobile" value={appointment.referenceMobile} />
        </CardContent>
      </Card>

      {/* Family Members */}
      {getFamilyMembers().length > 0 && getFamilyMembers().some(m => m.name || m.relation) && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Family Members</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">Sr</TableHead>
                  <TableHead className="text-xs font-semibold">Name</TableHead>
                  <TableHead className="text-xs font-semibold">Relation</TableHead>
                  <TableHead className="text-xs font-semibold">DOB</TableHead>
                  <TableHead className="text-xs font-semibold">Mobile</TableHead>
                  <TableHead className="text-xs font-semibold">Occupation</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {getFamilyMembers().map((m, i) => (
                    <TableRow key={i}><TableCell className="text-center text-xs font-bold">{i + 1}</TableCell>
                      <TableCell className="text-sm">{m.name || '-'}</TableCell>
                      <TableCell className="text-sm">{m.relation || '-'}</TableCell>
                      <TableCell className="text-sm">{m.dob || '-'}</TableCell>
                      <TableCell className="text-sm">{m.mobile || '-'}</TableCell>
                      <TableCell className="text-sm">{m.occupation || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submitted info + rejection */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6">
          <Field label="Submitted" value={new Date(appointment.submittedAt).toLocaleString('en-IN')} />
          <Field label="Status" value={appointment.status} />
          {appointment.rejectionReason && (
            <div className="col-span-2"><p className="text-muted-foreground text-xs">Rejection Reason</p><p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{appointment.rejectionReason}</p></div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {appointment.status === 'PENDING' && (
        <div className="flex items-center gap-3">
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setShowApproveDialog(true)}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
          </Button>
          <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
            <XCircle className="h-4 w-4 mr-1.5" /> Reject
          </Button>
        </div>
      )}

      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Approve Application</AlertDialogTitle>
          <AlertDialogDescription>Approve the appointment application from {getName()}?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={actionLoading} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Approve
            </AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <Dialog open={showRejectDialog} onOpenChange={(o) => { if (!o) { setShowRejectDialog(false); setRejectReason(''); } }}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Reject Application</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Rejection Reason</Label><Textarea placeholder="Enter reason..." rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectReason(''); }}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}>
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Reject
              </Button>
            </div>
          </div></DialogContent>
      </Dialog>
    </div>
  );
}
