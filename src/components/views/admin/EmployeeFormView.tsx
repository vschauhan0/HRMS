'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavStore } from '@/store/nav-store';
import { useAuthStore } from '@/store/auth-store';
import { apiGet, apiPost, apiPut } from '@/lib/api-client';
import { toast } from 'sonner';
import type { Employee, Branch, Company } from '@/types';

const employeeSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().min(1, 'Mobile is required'),
  branchId: z.string().min(1, 'Branch is required'),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function EmployeeFormView() {
  const { getParam, navigate } = useNavStore();
  const { selectedCompany, isSuperAdmin } = useAuthStore();
  const editId = getParam('id') as string | undefined;
  const isEdit = !!editId;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    selectedCompany?.id || ''
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employeeCode: '',
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      branchId: '',
    },
  });

  const watchBranchId = watch('branchId');

  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await apiGet<Branch[]>(`/branches?companyId=${selectedCompanyId}&pageSize=100`);
        setBranches(Array.isArray(res) ? res : (res as any)?.data || []);
      } catch { setBranches([]); }
    }
    if (selectedCompanyId) fetchBranches();
  }, [selectedCompanyId]);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await apiGet<Company[]>('/companies?pageSize=100');
        setCompanies(Array.isArray(res) ? res : (res as any)?.data || []);
      } catch { setCompanies([]); }
    }
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!editId) return;
    async function fetchEmployee() {
      try {
        const emp = await apiGet<Employee>(`/employees/${editId}`);
        reset({
          employeeCode: emp.employeeCode,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          mobile: emp.mobile,
          branchId: emp.branchId,
        });
        if (emp.companyId) setSelectedCompanyId(emp.companyId);
      } catch { toast.error('Failed to load employee data'); } finally { setFetching(false); }
    }
    fetchEmployee();
  }, [editId, reset]);

  async function onSubmit(data: EmployeeFormValues) {
    setLoading(true);
    try {
      const payload = { ...data, companyId: selectedCompanyId };
      if (isEdit) {
        await apiPut(`/employees/${editId}`, payload);
        toast.success('Employee updated successfully');
      } else {
        await apiPost('/employees', payload);
        toast.success('Employee added successfully');
      }
      navigate('employees');
    } catch (err: any) { toast.error(err.message || 'Failed to save employee'); } finally { setLoading(false); }
  }

  if (fetching) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('employees')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? 'Edit Employee' : 'Add Employee'}
        </h1>
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee Code <span className="text-red-500">*</span></Label>
                <Input disabled={isEdit || isSubmitting} {...register('employeeCode')} />
                {errors.employeeCode && <p className="text-sm text-red-500">{errors.employeeCode.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>First Name <span className="text-red-500">*</span></Label>
                <Input disabled={isSubmitting} {...register('firstName')} />
                {errors.firstName && <p className="text-sm text-red-500">{errors.firstName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Last Name <span className="text-red-500">*</span></Label>
                <Input disabled={isSubmitting} {...register('lastName')} />
                {errors.lastName && <p className="text-sm text-red-500">{errors.lastName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input type="email" disabled={isSubmitting} {...register('email')} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Mobile <span className="text-red-500">*</span></Label>
                <Input disabled={isSubmitting} {...register('mobile')} />
                {errors.mobile && <p className="text-sm text-red-500">{errors.mobile.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={selectedCompanyId} onValueChange={(v) => { setSelectedCompanyId(v); setValue('branchId', '', { shouldValidate: true }); }} disabled={!isSuperAdmin() || isSubmitting}>
                  <SelectTrigger disabled={!isSuperAdmin() || isSubmitting}>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Branch <span className="text-red-500">*</span></Label>
                <Select value={watchBranchId} onValueChange={(v) => setValue('branchId', v, { shouldValidate: true })} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.branchId && <p className="text-sm text-red-500">{errors.branchId.message}</p>}
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              Other details (address, bank, PAN, DOB, etc.) can be filled by the employee from their profile.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? 'Update' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('employees')} disabled={isSubmitting}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}