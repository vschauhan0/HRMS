'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, User, Phone, Building2, MapPin, Upload, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { appointmentFormSchema, type AppointmentFormInput } from '@/lib/validators';
import { apiPost, apiUpload, apiGet } from '@/lib/api-client';
import { useNavStore } from '@/store/nav-store';
import type { Company, Branch } from '@/types';

export default function AppointmentFormView() {
  const navigate = useNavStore((s) => s.navigate);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submittedAppNo, setSubmittedAppNo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AppointmentFormInput>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      mobile: '',
      companyId: '',
      branchId: '',
    },
  });

  useEffect(() => {
    apiGet<Company[]>('/companies')
      .then(setCompanies)
      .catch(() => toast.error('Failed to load companies'));
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) {
      setBranches([]);
      setSelectedBranchId('');
      setValue('branchId', '');
      return;
    }
    apiGet<Branch[]>(`/companies/${selectedCompanyId}/branches`)
      .then((data) => setBranches(data))
      .catch(() => {
        setBranches([]);
        toast.error('Failed to load branches');
      });
  }, [selectedCompanyId, setValue]);

  const onSubmit = async (data: AppointmentFormInput) => {
    setLoading(true);
    try {
      let res: { applicationNo: string };
      if (file) {
        const formData = new FormData();
        formData.append('fullName', data.fullName);
        formData.append('email', data.email);
        formData.append('mobile', data.mobile);
        formData.append('companyId', data.companyId);
        formData.append('branchId', data.branchId);
        formData.append('document', file);
        res = await apiUpload<{ applicationNo: string }>('/appointments', formData);
      } else {
        res = await apiPost<{ applicationNo: string }>('/appointments', data);
      }
      setSubmittedAppNo(res.applicationNo);
      toast.success('Application submitted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (submittedAppNo) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
            <div className="bg-primary/10 flex size-16 items-center justify-center rounded-full">
              <CheckCircle2 className="text-primary size-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Application Submitted</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Your appointment application has been received.
              </p>
            </div>
            <div className="bg-muted w-full rounded-lg p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Application Number</p>
              <p className="mt-1 text-lg font-bold font-mono">{submittedAppNo}</p>
            </div>
            <p className="text-muted-foreground text-sm">
              Save this number to track your application status.
            </p>
            <div className="flex w-full flex-col gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('track-application')}
              >
                <FileText className="mr-2 size-4" />
                Track Application
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setSubmittedAppNo('');
                }}
              >
                Submit Another Application
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Appointment Application Form
          </CardTitle>
          <CardDescription>
            Fill in the details below to submit your appointment application
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  className="pl-10"
                  {...register('fullName')}
                  disabled={loading}
                />
              </div>
              {errors.fullName && (
                <p className="text-destructive text-sm">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="app-email">Email</Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="app-email"
                  type="email"
                  placeholder="you@company.com"
                  className="pl-10"
                  {...register('email')}
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email.message}</p>
              )}
            </div>

            {/* Mobile */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="mobile">Mobile</Label>
              <div className="relative">
                <Phone className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="mobile"
                  placeholder="+91 9876543210"
                  className="pl-10"
                  {...register('mobile')}
                  disabled={loading}
                />
              </div>
              {errors.mobile && (
                <p className="text-destructive text-sm">{errors.mobile.message}</p>
              )}
            </div>

            {/* Company Select */}
            <div className="flex flex-col gap-2">
              <Label>Company</Label>
              <Select
                value={selectedCompanyId}
                onValueChange={(value) => {
                  setSelectedCompanyId(value);
                  setSelectedBranchId('');
                  setValue('companyId', value);
                  setValue('branchId', '');
                }}
                disabled={loading || companies.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.companyId && (
                <p className="text-destructive text-sm">{errors.companyId.message}</p>
              )}
            </div>

            {/* Branch Select */}
            <div className="flex flex-col gap-2">
              <Label>Branch</Label>
              <Select
                value={selectedBranchId}
                onValueChange={(value) => {
                  setSelectedBranchId(value);
                  setValue('branchId', value);
                }}
                disabled={loading || branches.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={selectedCompanyId ? 'Select a branch' : 'Select a company first'} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.branchId && (
                <p className="text-destructive text-sm">{errors.branchId.message}</p>
              )}
            </div>

            {/* File Upload */}
            <div className="flex flex-col gap-2">
              <Label>Documents (Optional)</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-input bg-background hover:bg-accent/50 cursor-pointer flex items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors"
              >
                <Upload className="text-muted-foreground size-5" />
                <div className="flex-1">
                  {file ? (
                    <p className="text-sm font-medium">{file.name}</p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Click to upload a document (PDF, DOC, etc.)
                    </p>
                  )}
                </div>
                {file && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-muted-foreground hover:text-destructive text-xs transition-colors"
                  >
                    Remove
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) setFile(selected);
                  }}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Submit Application
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <button
            onClick={() => navigate('track-application')}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            <FileText className="size-3.5" />
            Track an Existing Application
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}