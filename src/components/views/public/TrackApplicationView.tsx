'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, Loader2, FileText, User, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { trackApplicationSchema, type TrackApplicationInput } from '@/lib/validators';
import { apiPost } from '@/lib/api-client';
import { useNavStore } from '@/store/nav-store';
import type { AppointmentForm, ApplicationStatus } from '@/types';

const statusConfig: Record<ApplicationStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  },
};

export default function TrackApplicationView() {
  const navigate = useNavStore((s) => s.navigate);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AppointmentForm | null>(null);
  const [notFound, setNotFound] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackApplicationInput>({
    resolver: zodResolver(trackApplicationSchema),
    defaultValues: { applicationNo: '' },
  });

  const onSubmit = async (data: TrackApplicationInput) => {
    setLoading(true);
    setNotFound(false);
    setResult(null);
    try {
      const res = await apiPost<AppointmentForm>('/appointments/track', data);
      setResult(res);
    } catch (error: any) {
      if (error.message?.toLowerCase().includes('not found') || error.message?.toLowerCase().includes('no application')) {
        setNotFound(true);
      } else {
        toast.error(error.message || 'Failed to track application');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Track Application
            </CardTitle>
            <CardDescription>
              Enter your application number to check the status
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="applicationNo">Application Number</Label>
                <div className="relative">
                  <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    id="applicationNo"
                    placeholder="e.g. APP-2024-001"
                    className="pl-10"
                    {...register('applicationNo')}
                    disabled={loading}
                  />
                </div>
                {errors.applicationNo && (
                  <p className="text-destructive text-sm">
                    {errors.applicationNo.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Track
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center">
            <button
              onClick={() => navigate('appointment-form')}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
            >
              <FileText className="size-3.5" />
              Submit New Application
            </button>
          </CardFooter>
        </Card>

        {/* Not Found */}
        {notFound && (
          <Card className="mt-4">
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <div className="bg-destructive/10 flex size-12 items-center justify-center rounded-full">
                <AlertCircle className="text-destructive size-6" />
              </div>
              <div className="text-center">
                <p className="font-medium">Application Not Found</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Please check the application number and try again.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Application Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Application Number */}
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <FileText className="size-3.5" />
                    Application No
                  </span>
                  <span className="font-mono text-sm font-semibold">{result.applicationNo}</span>
                </div>

                {/* Applicant Name */}
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <User className="size-3.5" />
                    Applicant Name
                  </span>
                  <span className="text-sm font-medium">{result.fullName}</span>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    Status
                  </span>
                  <Badge variant="outline" className={`mt-0.5 w-fit ${statusConfig[result.status]?.className}`}>
                    {statusConfig[result.status]?.label || result.status}
                  </Badge>
                </div>

                {/* Submitted Date */}
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Calendar className="size-3.5" />
                    Submitted Date
                  </span>
                  <span className="text-sm">{formatDate(result.submittedAt)}</span>
                </div>
              </div>

              {/* Rejection reason */}
              {result.status === 'REJECTED' && result.rejectionReason && (
                <>
                  <Separator />
                  <div className="bg-destructive/5 rounded-lg p-3 dark:bg-destructive/10">
                    <p className="text-destructive text-xs font-medium uppercase tracking-wider">Rejection Reason</p>
                    <p className="mt-1 text-sm">{result.rejectionReason}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}