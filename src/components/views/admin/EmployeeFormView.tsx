'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().min(1, 'Mobile is required'),
  pan: z.string().optional(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  department: z.string().optional(),
  designation: z.string().optional(),
  branchId: z.string().min(1, 'Branch is required'),
  address: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function EmployeeFormView() {
  const { getParam, navigate } = useNavStore();
  const { selectedCompany, isSuperAdmin } = useAuthStore();
  const editId = getParam('id') as string | undefined;
  const isEdit = !!editId;
  const isView = getParam('view') as boolean | undefined;

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
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      pan: '',
      joiningDate: '',
      department: '',
      designation: '',
      branchId: '',
      address: '',
    },
  });

  const watchBranchId = watch('branchId');

  // Fetch branches based on selected company
  useEffect(() => {
    async function fetchBranches() {
      try {
        const res = await apiGet<{ data: Branch[] }>(
          `/branches?companyId=${selectedCompanyId}&pageSize=100`
        );
        setBranches(res.data || []);
      } catch {
        setBranches([]);
      }
    }
    if (selectedCompanyId) {
      fetchBranches();
    }
  }, [selectedCompanyId]);

  // Fetch companies for super admin
  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await apiGet<{ data: Company[] }>('/companies?pageSize=100');
        setCompanies(res.data || []);
      } catch {
        setCompanies([]);
      }
    }
    fetchCompanies();
  }, []);

  // Fetch employee data for edit mode
  useEffect(() => {
    if (!editId) return;
    async function fetchEmployee() {
      try {
        const res = await apiGet<Employee>(`/employees/${editId}`);
        const emp = res;
        reset({
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          mobile: emp.mobile,
          pan: emp.pan || '',
          joiningDate: emp.joiningDate?.split('T')[0] || '',
          department: emp.department || '',
          designation: emp.designation || '',
          branchId: emp.branchId,
          address: emp.address || '',
        });
        if (emp.companyId) {
          setSelectedCompanyId(emp.companyId);
        }
      } catch {
        toast.error('Failed to load employee data');
      } finally {
        setFetching(false);
      }
    }
    fetchEmployee();
  }, [editId, reset]);

  async function onSubmit(data: EmployeeFormValues) {
    setLoading(true);
    try {
      const payload = {
        ...data,
        companyId: selectedCompanyId,
      };
      if (isEdit) {
        await apiPut(`/employees/${editId}`, payload);
        toast.success('Employee updated successfully');
      } else {
        await apiPost('/employees', payload);
        toast.success('Employee added successfully');
      }
      navigate('employees');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save employee');
    } finally {
      setLoading(false);
    }
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
          {isView ? 'View Employee' : isEdit ? 'Edit Employee' : 'Add Employee'}
        </h1>
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  disabled={isView || isSubmitting}
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  disabled={isView || isSubmitting}
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  disabled={isView || isSubmitting}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">
                  Mobile <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mobile"
                  disabled={isView || isSubmitting}
                  {...register('mobile')}
                />
                {errors.mobile && (
                  <p className="text-sm text-red-500">{errors.mobile.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pan">PAN</Label>
                <Input
                  id="pan"
                  disabled={isView || isSubmitting}
                  {...register('pan')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="joiningDate">
                  Joining Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="joiningDate"
                  type="date"
                  disabled={isView || isSubmitting}
                  {...register('joiningDate')}
                />
                {errors.joiningDate && (
                  <p className="text-sm text-red-500">{errors.joiningDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  disabled={isView || isSubmitting}
                  {...register('department')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  disabled={isView || isSubmitting}
                  {...register('designation')}
                />
              </div>

              <div className="space-y-2">
                <Label>Company</Label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={(v) => {
                    setSelectedCompanyId(v);
                    setValue('branchId', '', { shouldValidate: true });
                  }}
                  disabled={!isSuperAdmin() || isView || isSubmitting}
                >
                  <SelectTrigger disabled={!isSuperAdmin() || isView || isSubmitting}>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>
                  Branch <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watchBranchId}
                  onValueChange={(v) => setValue('branchId', v, { shouldValidate: true })}
                  disabled={isView || isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.branchId && (
                  <p className="text-sm text-red-500">{errors.branchId.message}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  rows={3}
                  disabled={isView || isSubmitting}
                  {...register('address')}
                />
              </div>
            </div>

            {!isView && (
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isEdit ? 'Update' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('employees')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}