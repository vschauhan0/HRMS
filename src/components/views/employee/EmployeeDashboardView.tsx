'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useNavStore } from '@/store/nav-store';
import type { Employee, SalarySlip, Form16Document, PaginatedResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  FileText,
  Receipt,
  UserCheck,
  Building2,
  Download,
  Eye,
} from 'lucide-react';

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function EmployeeDashboardView() {
  const { user } = useAuthStore();
  const navigate = useNavStore();
  const [profile, setProfile] = useState<Employee | null>(null);
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [form16Docs, setForm16Docs] = useState<Form16Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSlips, setTotalSlips] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, slipsRes, form16Res] = await Promise.all([
          apiGet<Employee>('/profile'),
          apiGet<PaginatedResponse<SalarySlip>>('/salary/slips?pageSize=5'),
          apiGet<Form16Document[]>('/form16'),
        ]);

        setProfile(profileRes || null);
        setSlips(slipsRes.data || []);
        setTotalSlips(slipsRes.total || 0);
        setForm16Docs(form16Res || []);
      } catch {
        // Silently handle - will show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const firstName = profile?.firstName || user?.employee?.firstName || '';
  const lastName = profile?.lastName || user?.employee?.lastName || '';
  const companyName = profile?.company?.name || user?.employee?.company?.name || '';
  const branchName = profile?.branch?.name || user?.employee?.branch?.name || '';

  const currentMonthSlip = slips.length > 0 ? slips[0] : null;
  const profileCompletion = profile
    ? [
        profile.email,
        profile.mobile,
        profile.pan,
        profile.department,
        profile.designation,
        profile.address,
      ].filter(Boolean).length / 6 * 100
    : 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {firstName} {lastName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Here&apos;s your salary overview</p>
      </div>

      {/* Company & Branch Info */}
      {(companyName || branchName) && (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{companyName || 'Company'}</p>
                {branchName && (
                  <p className="text-sm text-muted-foreground">{branchName}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Current Month Salary Slip */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Month Salary</p>
                  {currentMonthSlip ? (
                    <>
                      <p className="text-xl font-semibold mt-0.5">
                        {formatCurrency(currentMonthSlip.netSalary)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {MONTHS[currentMonthSlip.month]} {currentMonthSlip.year}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5">Not available</p>
                  )}
                </div>
              </div>
              {currentMonthSlip && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('my-salary')}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  View
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form 16 Documents */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Form 16 Documents</p>
                  <p className="text-xl font-semibold mt-0.5">{form16Docs.length}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Available for download</p>
                </div>
              </div>
              {form16Docs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('my-form16')}
                >
                  View All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Salary Slips */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Receipt className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Salary Slips</p>
                <p className="text-xl font-semibold mt-0.5">{totalSlips}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Completion */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <UserCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Profile Completion</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${Math.round(profileCompletion)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{Math.round(profileCompletion)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Salary Slips */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Salary Slips</CardTitle>
        </CardHeader>
        <CardContent>
          {slips.length === 0 ? (
            <div className="py-8 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No salary slips available yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {slips.map((slip) => (
                <div
                  key={slip.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {MONTHS[slip.month]} {slip.year}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Net: {formatCurrency(slip.netSalary)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary" disabled>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}