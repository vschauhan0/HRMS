'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { apiGet } from '@/lib/api-client';
import type { Employee, AppointmentForm, PaginatedResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  Users,
  UserCheck,
  UserX,
  Clock,
  FileBarChart,
  UserPlus,
  CalendarCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

const MONTHS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
  PENDING: 'outline',
  RESIGNED: 'destructive',
  APPROVED: 'default',
  REJECTED: 'destructive',
};

// --- Employee Report Tab ---
function EmployeeReportTab() {
  const { selectedCompany } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('pageSize', '200');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (deptFilter !== 'all') params.set('department', deptFilter);
      if (selectedCompany?.id) params.set('companyId', selectedCompany.id);
      const res = await apiGet<PaginatedResponse<Employee>>(`/reports/employees?${params.toString()}`);
      setEmployees(res.data || []);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, deptFilter, selectedCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((e) => { if (e.department) depts.add(e.department); });
    return Array.from(depts).sort();
  }, [employees]);

  const stats = useMemo(() => {
    const all = employees.length;
    const active = employees.filter((e) => e.status === 'ACTIVE').length;
    const pending = employees.filter((e) => e.status === 'PENDING').length;
    const resigned = employees.filter((e) => e.status === 'RESIGNED').length;
    return { all, active, pending, resigned };
  }, [employees]);

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="RESIGNED">Resigned</SelectItem>
          </SelectContent>
        </Select>
        {departments.length > 0 && (
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="sm:ml-auto">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{stats.all}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-lg font-semibold text-emerald-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-semibold text-amber-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">Resigned</p>
                <p className="text-lg font-semibold text-red-600">{stats.resigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No employees found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emp Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Branch</TableHead>
                    <TableHead className="hidden sm:table-cell">Department</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-xs">{emp.employeeCode}</TableCell>
                      <TableCell className="font-medium">
                        {emp.firstName} {emp.lastName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {emp.email}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {emp.branch?.name || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {emp.department || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[emp.status] || 'outline'}>
                          {emp.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Salary Report Tab ---
interface SalarySummaryRow {
  month: number;
  year: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
}

function SalaryReportTab() {
  const { selectedCompany } = useAuthStore();
  const [data, setData] = useState<SalarySummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));

  useEffect(() => {
    async function fetchSalaryReport() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('year', selectedYear);
        if (selectedCompany?.id) params.set('companyId', selectedCompany.id);
        const res = await apiGet<SalarySummaryRow[]>(`/reports/salary?${params.toString()}`);
        setData(res || []);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSalaryReport();
  }, [selectedYear, selectedCompany]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="py-12 text-center">
              <FileBarChart className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No salary data found for {selectedYear}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Total Gross</TableHead>
                    <TableHead className="text-right">Total Deductions</TableHead>
                    <TableHead className="text-right">Total Net</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={`${row.year}-${row.month}`}>
                      <TableCell className="font-medium">
                        {MONTHS[row.month]} {row.year}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.totalGross)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(row.totalDeductions)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(row.totalNet)}</TableCell>
                      <TableCell className="text-right">{row.employeeCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Registrations Tab ---
function RegistrationsTab() {
  const { selectedCompany } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPending() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('status', 'PENDING');
        params.set('pageSize', '200');
        if (selectedCompany?.id) params.set('companyId', selectedCompany.id);
        const res = await apiGet<PaginatedResponse<Employee>>(`/employees?${params.toString()}`);
        setEmployees(res.data || []);
      } catch {
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPending();
  }, [selectedCompany]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="py-12 text-center">
            <UserPlus className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No pending registrations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Mobile</TableHead>
                  <TableHead>Joining Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-xs">{emp.employeeCode}</TableCell>
                    <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{emp.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">{emp.mobile}</TableCell>
                    <TableCell>{formatDate(emp.joiningDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Appointments Tab ---
function AppointmentsTab() {
  const { selectedCompany } = useAuthStore();
  const [appointments, setAppointments] = useState<AppointmentForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchAppointments() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('pageSize', '200');
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (selectedCompany?.id) params.set('companyId', selectedCompany.id);
        const res = await apiGet<PaginatedResponse<AppointmentForm>>(`/appointments?${params.toString()}`);
        setAppointments(res.data || []);
      } catch {
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAppointments();
  }, [statusFilter, selectedCompany]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No appointment applications found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Company</TableHead>
                    <TableHead className="hidden sm:table-cell">Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-mono text-xs">{app.applicationNo}</TableCell>
                      <TableCell className="font-medium">{app.fullName}</TableCell>
                      <TableCell className="hidden md:table-cell">{app.company?.name || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell">{app.branch?.name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[app.status] || 'outline'}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDate(app.submittedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main Reports View ---
export default function ReportsView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and analyze employee and salary data
        </p>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="w-full sm:w-auto flex">
          <TabsTrigger value="employees" className="flex-1 sm:flex-none">Employee Report</TabsTrigger>
          <TabsTrigger value="salary" className="flex-1 sm:flex-none">Salary Report</TabsTrigger>
          <TabsTrigger value="registrations" className="flex-1 sm:flex-none">Registrations</TabsTrigger>
          <TabsTrigger value="appointments" className="flex-1 sm:flex-none">Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <EmployeeReportTab />
        </TabsContent>
        <TabsContent value="salary">
          <SalaryReportTab />
        </TabsContent>
        <TabsContent value="registrations">
          <RegistrationsTab />
        </TabsContent>
        <TabsContent value="appointments">
          <AppointmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}