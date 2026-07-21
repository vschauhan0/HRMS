'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Mail, User, Phone, Building2, MapPin, Upload, Loader2,
  CheckCircle2, FileText, ArrowLeft, Sparkles, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { apiPost, apiUpload } from '@/lib/api-client';
import { useNavStore } from '@/store/nav-store';
import type { Company, Branch } from '@/types';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

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
    // Use public endpoint (no auth required)
    fetch('/api/v1/public/companies')
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setCompanies(res.data || []);
      })
      .catch(() => toast.error('Failed to load companies'));
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) {
      setBranches([]);
      setSelectedBranchId('');
      setValue('branchId', '');
      return;
    }
    // Use public endpoint (no auth required)
    fetch(`/api/v1/public/branches?companyId=${selectedCompanyId}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setBranches(res.data || []);
      })
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
      <div className="relative min-h-screen overflow-hidden">
        <div className="gradient-mesh absolute inset-0" />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-float absolute -top-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl" style={{ animationDelay: '0s' }} />
          <div className="animate-float absolute -bottom-20 right-1/3 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, duration: 0.6 }}
            className="w-full max-w-md space-y-4"
          >
            <Card className="glass-strong border-border/50">
              <CardContent className="flex flex-col items-center gap-5 pt-8 pb-8 px-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10"
                >
                  <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 h-8 w-8" />
                </motion.div>

                <div className="text-center space-y-1.5">
                  <h2 className="text-xl font-bold tracking-tight">Application Submitted!</h2>
                  <p className="text-muted-foreground text-sm">
                    Your appointment application has been received successfully.
                  </p>
                </div>

                <div className="w-full rounded-xl bg-muted/50 border border-border/50 p-4 text-center">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">Application Number</p>
                  <p className="mt-1.5 text-lg font-bold font-mono tracking-wide">{submittedAppNo}</p>
                </div>

                <p className="text-muted-foreground text-xs text-center">
                  Save this application number to track your status. Our team will review your application shortly.
                </p>

                <div className="w-full flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl"
                    onClick={() => navigate('track-application')}
                  >
                    <FileText className="mr-2 size-4" />
                    Track Application Status
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-11 rounded-xl"
                    onClick={() => {
                      setSubmittedAppNo('');
                    }}
                  >
                    Submit Another Application
                  </Button>
                </div>
              </CardContent>
            </Card>

            <button
              onClick={() => navigate('login')}
              className="flex items-center justify-center gap-1.5 mx-auto text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Back to Login
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="gradient-mesh absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float absolute -top-20 -left-20 h-72 w-72 rounded-full bg-indigo-500/5 dark:bg-indigo-400/5 blur-3xl" style={{ animationDelay: '0s' }} />
        <div className="animate-float absolute top-1/3 -right-16 h-96 w-96 rounded-full bg-violet-500/5 dark:bg-violet-400/5 blur-3xl" style={{ animationDelay: '2s' }} />
        <div className="animate-float absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-emerald-500/5 dark:bg-emerald-400/5 blur-3xl" style={{ animationDelay: '4s' }} />
      </div>

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, duration: 0.6 }}
          className="w-full max-w-lg space-y-4"
        >
          {/* Back link */}
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            onClick={() => navigate('login')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Login
          </motion.button>

          {/* Form Card */}
          <Card className="glass-strong border-border/50">
            <CardHeader className="text-center pb-4 pt-8 px-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
                className="animate-pulse-glow relative mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary"
              >
                <Sparkles className="text-primary-foreground h-6 w-6" />
                <div className="animate-spin-slow absolute -inset-1 rounded-2xl border border-dashed border-primary/10" />
              </motion.div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Appointment Application
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Fill in your details to apply for an appointment
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8">
              <motion.form
                variants={container}
                initial="hidden"
                animate="show"
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-5"
              >
                {/* Full Name */}
                <motion.div variants={item} className="flex flex-col gap-2">
                  <Label htmlFor="fullName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Full Name
                  </Label>
                  <div className="group relative">
                    <User className="text-muted-foreground/60 absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors group-focus-within:text-foreground" />
                    <Input
                      id="fullName"
                      placeholder="Enter your full name"
                      className="h-11 rounded-xl border-border/50 bg-background/50 pl-11 shadow-sm transition-all focus-visible:bg-background focus-visible:shadow-md"
                      {...register('fullName')}
                      disabled={loading}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-destructive text-xs font-medium">{errors.fullName.message}</p>
                  )}
                </motion.div>

                {/* Email */}
                <motion.div variants={item} className="flex flex-col gap-2">
                  <Label htmlFor="app-email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </Label>
                  <div className="group relative">
                    <Mail className="text-muted-foreground/60 absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors group-focus-within:text-foreground" />
                    <Input
                      id="app-email"
                      type="email"
                      placeholder="you@company.com"
                      className="h-11 rounded-xl border-border/50 bg-background/50 pl-11 shadow-sm transition-all focus-visible:bg-background focus-visible:shadow-md"
                      {...register('email')}
                      disabled={loading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-xs font-medium">{errors.email.message}</p>
                  )}
                </motion.div>

                {/* Mobile */}
                <motion.div variants={item} className="flex flex-col gap-2">
                  <Label htmlFor="mobile" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Mobile Number
                  </Label>
                  <div className="group relative">
                    <Phone className="text-muted-foreground/60 absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors group-focus-within:text-foreground" />
                    <Input
                      id="mobile"
                      placeholder="+91 9876543210"
                      className="h-11 rounded-xl border-border/50 bg-background/50 pl-11 shadow-sm transition-all focus-visible:bg-background focus-visible:shadow-md"
                      {...register('mobile')}
                      disabled={loading}
                    />
                  </div>
                  {errors.mobile && (
                    <p className="text-destructive text-xs font-medium">{errors.mobile.message}</p>
                  )}
                </motion.div>

                {/* Company Select */}
                <motion.div variants={item} className="flex flex-col gap-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Company
                  </Label>
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
                    <SelectTrigger className="h-11 rounded-xl border-border/50 bg-background/50 shadow-sm transition-all focus:ring-1 focus:ring-ring">
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {company.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.companyId && (
                    <p className="text-destructive text-xs font-medium">{errors.companyId.message}</p>
                  )}
                </motion.div>

                {/* Branch Select */}
                <motion.div variants={item} className="flex flex-col gap-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Branch
                  </Label>
                  <Select
                    value={selectedBranchId}
                    onValueChange={(value) => {
                      setSelectedBranchId(value);
                      setValue('branchId', value);
                    }}
                    disabled={loading || branches.length === 0}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-border/50 bg-background/50 shadow-sm transition-all focus:ring-1 focus:ring-ring">
                      <SelectValue placeholder={selectedCompanyId ? 'Select a branch' : 'Select a company first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {branch.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.branchId && (
                    <p className="text-destructive text-xs font-medium">{errors.branchId.message}</p>
                  )}
                </motion.div>

                {/* File Upload */}
                <motion.div variants={item} className="flex flex-col gap-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Document (Optional)
                  </Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group cursor-pointer rounded-xl border-2 border-dashed border-border/50 bg-background/30 p-4 transition-all hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 transition-colors group-hover:bg-primary/10">
                        <Upload className="text-muted-foreground h-4 w-4 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {file ? (
                          <div>
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Click to upload
                            </p>
                            <p className="text-xs text-muted-foreground/60">
                              PDF, DOC, JPG, PNG
                            </p>
                          </div>
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
                          className="text-muted-foreground hover:text-destructive text-xs font-medium transition-colors"
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
                </motion.div>

                {/* Submit Button */}
                <motion.div variants={item} className="pt-1">
                  <Button
                    type="submit"
                    className="hover-shine group relative h-11 w-full rounded-xl bg-foreground text-background font-medium shadow-md transition-all hover:shadow-lg"
                    disabled={loading}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading && <Loader2 className="size-4 animate-spin" />}
                      Submit Application
                      {!loading && (
                        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </span>
                  </Button>
                </motion.div>
              </motion.form>
            </CardContent>
          </Card>

          {/* Track Application Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="flex justify-center"
          >
            <button
              onClick={() => navigate('track-application')}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              <FileText className="size-3.5" />
              Already applied? Track your application
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}