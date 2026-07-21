'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Loader2, CheckCircle2, FileText, ArrowLeft, ChevronRight,
  Camera, X, Plus, Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

import { appointmentFormSchema, type AppointmentFormInput } from '@/lib/validators';
import { apiUpload } from '@/lib/api-client';
import { useNavStore } from '@/store/nav-store';
import type { Company, Branch, FamilyMember } from '@/types';

const REQUIRED = '*';

export default function AppointmentFormView() {
  const navigate = useNavStore((s) => s.navigate);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [submittedAppNo, setSubmittedAppNo] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { name: '', relation: '', dob: '', mobile: '', occupation: '' },
    { name: '', relation: '', dob: '', mobile: '', occupation: '' },
    { name: '', relation: '', dob: '', mobile: '', occupation: '' },
    { name: '', relation: '', dob: '', mobile: '', occupation: '' },
  ]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormInput>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      companyId: '', branchId: '', firstName: '', surname: '',
      email: '', mobile: '', whatsappNo: '', address: '',
      village: '', taluka: '', district: '', dob: '',
      department: '', designation: '', managerName: '', salary: '',
      referenceName: '', referenceMobile: '', aadharNumber: '',
      bankName: '', panNumber: '', bankIfsc: '', bankAccountNo: '',
    },
  });

  useEffect(() => {
    fetch('/api/v1/public/companies')
      .then((r) => r.json())
      .then((r) => { if (r.success) setCompanies(r.data || []); })
      .catch(() => toast.error('Failed to load companies'));
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) {
      setBranches([]); setSelectedBranchId(''); setValue('branchId', ''); return;
    }
    fetch(`/api/v1/public/branches?companyId=${selectedCompanyId}`)
      .then((r) => r.json())
      .then((r) => { if (r.success) setBranches(r.data || []); })
      .catch(() => { setBranches([]); toast.error('Failed to load branches'); });
  }, [selectedCompanyId, setValue]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: string) => {
    setFamilyMembers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const onSubmit = async (data: AppointmentFormInput) => {
    setLoading(true);
    try {
      const formData = new FormData();
      // Text fields
      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined && val !== '') formData.append(key, String(val));
      });
      // Joining date
      const jd = (watch as any)('joiningDate');
      if (jd) formData.append('joiningDate', jd);
      // DOB
      if (data.dob) formData.append('dob', data.dob);
      // Family members
      formData.append('familyMembers', JSON.stringify(familyMembers));
      // Photo
      const photoInput = photoInputRef.current;
      if (photoInput?.files?.[0]) {
        formData.append('photo', photoInput.files[0]);
      }

      const res = await apiUpload<{ applicationNo: string }>('/appointments', formData);
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
          <div className="animate-float absolute -top-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl" />
          <div className="animate-float absolute -bottom-20 right-1/3 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="w-full max-w-md space-y-4">
            <Card className="glass-strong border-border/50">
              <CardContent className="flex flex-col items-center gap-5 pt-8 pb-8 px-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 h-8 w-8" />
                </motion.div>
                <div className="text-center space-y-1.5">
                  <h2 className="text-xl font-bold tracking-tight">Application Submitted!</h2>
                  <p className="text-muted-foreground text-sm">Your appointment application has been received.</p>
                </div>
                <div className="w-full rounded-xl bg-muted/50 border border-border/50 p-4 text-center">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">Application Number</p>
                  <p className="mt-1.5 text-lg font-bold font-mono tracking-wide">{submittedAppNo}</p>
                </div>
                <div className="w-full flex flex-col gap-2 pt-2">
                  <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => navigate('track-application')}>
                    <FileText className="mr-2 size-4" /> Track Application Status
                  </Button>
                  <Button variant="ghost" className="w-full h-11 rounded-xl" onClick={() => setSubmittedAppNo('')}>
                    Submit Another Application
                  </Button>
                </div>
              </CardContent>
            </Card>
            <button onClick={() => navigate('login')}
              className="flex items-center justify-center gap-1.5 mx-auto text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
              <ArrowLeft className="size-3.5" /> Back to Login
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Form field component
  const FormField = ({ label, name, required, type = 'text', inputMode, maxLength, placeholder }: {
    label: string; name: string; required?: boolean; type?: string; inputMode?: string; maxLength?: number; placeholder?: string;
  }) => (
    <div className="flex items-end gap-2 w-full">
      <label className="text-[13px] font-semibold whitespace-nowrap w-[130px] shrink-0">
        {label} {required && <span className="text-red-500">{REQUIRED}</span>}
      </label>
      <span className="font-bold text-muted-foreground">:</span>
      <input
        type={type}
        inputMode={inputMode as any}
        maxLength={maxLength}
        placeholder={placeholder}
        {...register(name as any)}
        disabled={loading}
        className="border-b border-foreground/30 focus:border-foreground flex-grow h-7 focus:outline-none px-1 text-[13px] bg-transparent transition-colors disabled:opacity-50"
      />
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="gradient-mesh absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float absolute -top-20 -left-20 h-72 w-72 rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="animate-float absolute top-1/3 -right-16 h-96 w-96 rounded-full bg-violet-500/5 blur-3xl" style={{ animationDelay: '2s' }} />
        <div className="animate-float absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 min-h-screen p-3 sm:p-6 lg:p-8">
        {/* Back link */}
        <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          onClick={() => navigate('login')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors mb-4">
          <ArrowLeft className="size-3.5" /> Back to Login
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="mx-auto max-w-4xl">
          <Card className="glass-strong border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Header */}
                <div className="border-b border-border/50 px-6 py-4 sm:px-8 sm:py-5">
                  <h1 className="text-center text-lg sm:text-xl font-black tracking-[0.2em] uppercase">Appointment Form</h1>
                  <div className="mt-2 h-0.5 bg-foreground/80 mx-auto w-24" />
                </div>

                <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                  {/* ===== Section 1: Photo + Right Fields ===== */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    {/* Photo Upload */}
                    <div className="lg:col-span-5 flex flex-col items-center">
                      <label className="cursor-pointer group">
                        <input ref={photoInputRef} accept="image/*" className="hidden" type="file"
                          onChange={handlePhotoChange} />
                        <div className="w-44 h-52 sm:w-48 sm:h-56 border-2 border-dashed border-border hover:border-primary/50
                          flex items-center justify-center bg-muted/30 hover:bg-primary/5 overflow-hidden transition-all">
                          {photoPreview ? (
                            <img src={photoPreview} alt="Photo" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-4">
                              <Camera className="mx-auto h-8 w-8 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
                              <p className="font-semibold text-xs text-muted-foreground/60 group-hover:text-primary/60 mt-2 transition-colors">
                                CLICK TO ADD PHOTO
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 mt-1 text-center">(Click box to change image)</p>
                      </label>
                    </div>

                    {/* Right side fields */}
                    <div className="lg:col-span-7 space-y-2.5">
                      <FormField label="Emp. Code" name="employeeCode" />
                      <FormField label="Joining Date" name="joiningDate" required type="date" />
                      <FormField label="Department" name="department" required />
                      <FormField label="Designation" name="designation" required />
                      <FormField label="Manager Name" name="managerName" required />
                      <FormField label="Salary" name="salary" required />
                      <FormField label="Emp. Mobile No" name="mobile" required inputMode="numeric" maxLength={10} />
                      <FormField label="Emp. WhatsApp No" name="whatsappNo" required inputMode="numeric" maxLength={10} />
                    </div>
                  </div>

                  <div className="h-px bg-border/50" />

                  {/* ===== Section 2: Punching No + Name ===== */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <label className="font-semibold w-[130px] shrink-0 text-[13px]">
                        Punching No <span className="text-red-500">{REQUIRED}</span>
                      </label>
                      <span className="font-bold text-muted-foreground">:</span>
                      <input {...register('punchingNo')} inputMode="numeric" disabled={loading}
                        className="border border-border/50 w-48 h-7 px-2 outline-none text-[13px] bg-transparent focus:border-foreground/50 transition-colors rounded" />
                    </div>

                    {/* Name: First, Mid, Surname */}
                    <div className="flex items-start gap-2">
                      <label className="font-semibold w-[130px] shrink-0 pt-1.5 text-[13px]">
                        Name <span className="text-red-500">{REQUIRED}</span>
                      </label>
                      <span className="font-bold text-muted-foreground pt-1.5">:</span>
                      <div className="flex-grow grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <input {...register('firstName')} disabled={loading} placeholder="First"
                            className="w-full border-b border-foreground/30 focus:border-foreground h-7 text-[13px] focus:outline-none text-center bg-transparent uppercase transition-colors" />
                          <span className="text-[10px] text-muted-foreground font-semibold">(FIRST NAME)</span>
                          {errors.firstName && <p className="text-destructive text-[10px] mt-0.5">{errors.firstName.message}</p>}
                        </div>
                        <div className="text-center">
                          <input {...register('middleName')} disabled={loading} placeholder="Middle"
                            className="w-full border-b border-foreground/30 focus:border-foreground h-7 text-[13px] focus:outline-none text-center bg-transparent uppercase transition-colors" />
                          <span className="text-[10px] text-muted-foreground font-semibold">(MID NAME)</span>
                        </div>
                        <div className="text-center">
                          <input {...register('surname')} disabled={loading} placeholder="Surname"
                            className="w-full border-b border-foreground/30 focus:border-foreground h-7 text-[13px] focus:outline-none text-center bg-transparent uppercase transition-colors" />
                          <span className="text-[10px] text-muted-foreground font-semibold">(SURNAME)</span>
                          {errors.surname && <p className="text-destructive text-[10px] mt-0.5">{errors.surname.message}</p>}
                        </div>
                      </div>
                    </div>

                    <FormField label="Email" name="email" required type="email" />
                    <FormField label="Resident Add" name="address" required />
                  </div>

                  {/* Village, Taluka, District */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div className="min-w-0">
                      <div className="flex items-end gap-2">
                        <label className="font-semibold whitespace-nowrap text-[13px]">
                          Village <span className="text-red-500">{REQUIRED}</span>
                        </label>
                        <span className="font-bold text-muted-foreground">:</span>
                        <input {...register('village')} disabled={loading}
                          className="border-b border-foreground/30 focus:border-foreground min-w-0 flex-1 h-7 outline-none px-1 bg-transparent text-[13px] transition-colors" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-end gap-2">
                        <label className="font-semibold whitespace-nowrap text-[13px]">
                          Taluka <span className="text-red-500">{REQUIRED}</span>
                        </label>
                        <span className="font-bold text-muted-foreground">:</span>
                        <input {...register('taluka')} disabled={loading}
                          className="border-b border-foreground/30 focus:border-foreground min-w-0 flex-1 h-7 outline-none px-1 bg-transparent text-[13px] transition-colors" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-end gap-2">
                        <label className="font-semibold whitespace-nowrap text-[13px]">
                          District <span className="text-red-500">{REQUIRED}</span>
                        </label>
                        <span className="font-bold text-muted-foreground">:</span>
                        <input {...register('district')} disabled={loading}
                          className="border-b border-foreground/30 focus:border-foreground min-w-0 flex-1 h-7 outline-none px-1 bg-transparent text-[13px] transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border/50" />

                  {/* ===== Section 3: Personal Details Grid ===== */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                    <FormField label="Birth Date" name="dob" required type="date" />
                    <FormField label="Birth Place" name="birthPlace" />
                    <FormField label="Gender" name="gender" />
                    <FormField label="Cast" name="cast" />
                    <FormField label="Marital Status" name="maritalStatus" />
                    <FormField label="Blood Group" name="bloodGroup" />
                    <FormField label="Reference Name" name="referenceName" required />
                    <FormField label="Reference Mobile" name="referenceMobile" required inputMode="numeric" maxLength={10} />
                    <FormField label="Aadhar Card No" name="aadharNumber" required inputMode="numeric" maxLength={12} />
                    <FormField label="Bank Name" name="bankName" required />
                    <FormField label="PAN Card No" name="panNumber" required maxLength={10} />
                    <FormField label="Bank IFSC Code" name="bankIfsc" required maxLength={11} />
                    <FormField label="Education" name="education" />
                    <FormField label="Bank Account No" name="bankAccountNo" required inputMode="numeric" maxLength={18} />
                  </div>

                  <div className="h-px bg-border/50" />

                  {/* ===== Section 4: Family Members Table ===== */}
                  <div>
                    <h3 className="text-sm font-bold mb-3">Family Members</h3>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-12 text-center font-bold text-xs">Sr No</TableHead>
                            <TableHead className="font-bold text-xs">Family Members Name</TableHead>
                            <TableHead className="font-bold text-xs">Relation</TableHead>
                            <TableHead className="font-bold text-xs">D.O.B.</TableHead>
                            <TableHead className="font-bold text-xs">Mobile No</TableHead>
                            <TableHead className="font-bold text-xs">Occupation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {familyMembers.map((member, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-center font-bold text-xs border-r border-border">{i + 1}</TableCell>
                              <TableCell className="border-r border-border p-1">
                                <input className="w-full outline-none text-[13px] bg-transparent" value={member.name}
                                  onChange={(e) => updateFamilyMember(i, 'name', e.target.value)} disabled={loading} />
                              </TableCell>
                              <TableCell className="border-r border-border p-1">
                                <input className="w-full outline-none text-[13px] bg-transparent" value={member.relation}
                                  onChange={(e) => updateFamilyMember(i, 'relation', e.target.value)} disabled={loading} />
                              </TableCell>
                              <TableCell className="border-r border-border p-1">
                                <input type="date" className="w-full outline-none text-[13px] bg-transparent" value={member.dob}
                                  onChange={(e) => updateFamilyMember(i, 'dob', e.target.value)} disabled={loading} />
                              </TableCell>
                              <TableCell className="border-r border-border p-1">
                                <input className="w-full outline-none text-[13px] bg-transparent" value={member.mobile}
                                  onChange={(e) => updateFamilyMember(i, 'mobile', e.target.value)} disabled={loading} />
                              </TableCell>
                              <TableCell className="p-1">
                                <input className="w-full outline-none text-[13px] bg-transparent" value={member.occupation}
                                  onChange={(e) => updateFamilyMember(i, 'occupation', e.target.value)} disabled={loading} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="h-px bg-border/50" />

                  {/* ===== Section 5: Signature areas ===== */}
                  <div className="grid grid-cols-3 gap-8 font-bold text-[13px]">
                    <div>
                      <p className="mb-1">Check By, Manager</p>
                      <div className="border-b border-foreground/30 w-full h-8" />
                    </div>
                    <div className="text-center">
                      <p className="mb-1">Confirm By,</p>
                      <div className="border-b border-foreground/30 w-full h-8" />
                      <p className="mt-1 font-normal text-muted-foreground text-xs">(Ketanbhai)</p>
                    </div>
                    <div className="text-center">
                      <p className="mb-1">Auth. By,</p>
                      <div className="border-b border-foreground/30 w-full h-8" />
                      <p className="mt-1 font-normal text-muted-foreground text-xs">HR Dept</p>
                    </div>
                  </div>

                  <div className="h-px bg-border/50" />

                  {/* ===== Section 6: Company/Branch + Submit ===== */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                    <div className="flex flex-col gap-3 flex-1 w-full">
                      <div className="flex gap-2 items-center">
                        <span className="font-semibold whitespace-nowrap uppercase text-[13px]">
                          Company <span className="text-red-500">{REQUIRED}</span> :
                        </span>
                        <Select value={selectedCompanyId}
                          onValueChange={(v) => { setSelectedCompanyId(v); setSelectedBranchId(''); setValue('companyId', v); setValue('branchId', ''); }}
                          disabled={loading || companies.length === 0}>
                          <SelectTrigger className="h-7 border-b border-foreground/30 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent text-[13px] focus:ring-0">
                            <SelectValue placeholder="Select Company" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-[13px]">{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.companyId && <p className="text-destructive text-[10px]">{errors.companyId.message}</p>}
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="font-semibold whitespace-nowrap uppercase text-[13px]">
                          Unit Name <span className="text-red-500">{REQUIRED}</span> :
                        </span>
                        <Select value={selectedBranchId}
                          onValueChange={(v) => { setSelectedBranchId(v); setValue('branchId', v); }}
                          disabled={loading || branches.length === 0}>
                          <SelectTrigger className="h-7 border-b border-foreground/30 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent text-[13px] focus:ring-0">
                            <SelectValue placeholder={selectedCompanyId ? 'Select Unit' : 'Select company first'} />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((b) => (
                              <SelectItem key={b.id} value={b.id} className="text-[13px]">{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.branchId && <p className="text-destructive text-[10px]">{errors.branchId.message}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Submit button */}
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={loading}
                      className="hover-shine group relative h-11 px-8 rounded-xl bg-foreground text-background font-semibold shadow-md transition-all hover:shadow-lg">
                      <span className="relative z-10 flex items-center gap-2">
                        {loading && <Loader2 className="size-4 animate-spin" />}
                        Submit Application
                        {!loading && <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
                      </span>
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="flex justify-center mt-4">
            <button onClick={() => navigate('track-application')}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
              <FileText className="size-3.5" /> Already applied? Track your application
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
