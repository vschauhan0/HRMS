'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Plus, Upload, Download, Pencil, Eye, ChevronLeft, ChevronRight, MoreVertical, UserCheck, UserX, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Card, CardContent } from '@/components/ui/card';
import { useNavStore } from '@/store/nav-store';
import { useAuthStore } from '@/store/auth-store';
import { apiGet, apiPatch } from '@/lib/api-client';
import { STATUS_COLORS, PAGE_SIZE } from '@/lib/constants';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Employee, Branch, Company, PaginatedResponse } from '@/types';

export default function EmployeeListView() {
  const navigate = useNavStore((s) => s.navigate);
  const { isSuperAdmin, selectedCompany } = useAuthStore();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>(
    selectedCompany?.id || 'ALL'
  );
  const [page, setPage] = useState(1);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch branches/companies
  useEffect(() => {
    async function fetchLookups() {
      try {
        const companyId =
          companyFilter !== 'ALL' ? companyFilter : selectedCompany?.id;
        if (companyId) {
          const res = await apiGet<Branch[]>(
            `/branches?companyId=${companyId}&pageSize=100`
          );
          setBranches(Array.isArray(res) ? res : (res as any)?.data || []);
        }
        if (isSuperAdmin()) {
          const cRes = await apiGet<Company[]>(
            '/companies?pageSize=100'
          );
          setCompanies(Array.isArray(cRes) ? cRes : (cRes as any)?.data || []);
        }
      } catch {
        // silent
      }
    }
    fetchLookups();
  }, [companyFilter, selectedCompany, isSuperAdmin]);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (branchFilter !== 'ALL') params.set('branchId', branchFilter);
      const companyId =
        companyFilter !== 'ALL' ? companyFilter : selectedCompany?.id;
      if (companyId) params.set('companyId', companyId);

      const res = await apiGet<PaginatedResponse<Employee>>(
        `/employees?${params.toString()}`
      );
      setEmployees(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, branchFilter, companyFilter, page, selectedCompany]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  async function handleStatusChange(empId: string, newStatus: string) {
    try {
      await apiPatch(`/employees/${empId}/status`, { status: newStatus });
      toast.success(`Employee marked as ${newStatus}`);
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (branchFilter !== 'ALL') params.set('branchId', branchFilter);
    const companyId =
      companyFilter !== 'ALL' ? companyFilter : selectedCompany?.id;
    if (companyId) params.set('companyId', companyId);
    window.open(`/api/v1/employees/export?${params.toString()}`, '_blank');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('employee-add')}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Employee
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('employee-import')}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Import
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees by name, code, email..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="RESIGNED">Resigned</SelectItem>
          </SelectContent>
        </Select>

        <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isSuperAdmin() && companies.length > 0 && (
          <Select
            value={companyFilter}
            onValueChange={(v) => {
              setCompanyFilter(v);
              setBranchFilter('ALL');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Desktop Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <Card className="rounded-xl border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No employees found. Add your first employee.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  {isSuperAdmin() && companyFilter === 'ALL' && (
                    <TableHead className="hidden lg:table-cell">Company</TableHead>
                  )}
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden xl:table-cell">Mobile</TableHead>
                  <TableHead className="hidden lg:table-cell">Branch</TableHead>
                  <TableHead className="hidden xl:table-cell">Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-sm">{emp.employeeCode}</TableCell>
                    <TableCell className="font-medium">
                      {emp.firstName} {emp.lastName}
                    </TableCell>
                    {isSuperAdmin() && companyFilter === 'ALL' && (
                      <TableCell className="hidden lg:table-cell text-sm">
                        {emp.company?.name || '-'}
                      </TableCell>
                    )}
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {emp.email}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">
                      {emp.mobile}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {emp.branch?.name || '-'}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">
                      {emp.department || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[emp.status] || ''}
                      >
                        {emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            navigate('employee-edit', { id: emp.id })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            navigate('employee-edit', { id: emp.id, view: true })
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={emp.status === 'PENDING'}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStatusChange(emp.id, 'ACTIVE')}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Mark Active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(emp.id, 'INACTIVE')}>
                              <Ban className="h-4 w-4 mr-2" />
                              Mark Inactive
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(emp.id, 'RESIGNED')}>
                              <UserX className="h-4 w-4 mr-2" />
                              Mark Resigned
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {employees.map((emp) => (
              <Card key={emp.id} className="rounded-xl border shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {emp.employeeCode}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[emp.status] || ''}
                    >
                      {emp.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {isSuperAdmin() && companyFilter === 'ALL' && (
                      <div>
                        <p className="text-muted-foreground">Company</p>
                        <p>{emp.company?.name || '-'}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="truncate">{emp.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mobile</p>
                      <p>{emp.mobile}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Branch</p>
                      <p>{emp.branch?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Department</p>
                      <p>{emp.department || '-'}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 pt-1 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate('employee-edit', { id: emp.id })
                      }
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate('employee-edit', { id: emp.id, view: true })
                      }
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={emp.status === 'PENDING'}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStatusChange(emp.id, 'ACTIVE')}>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Mark Active
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(emp.id, 'INACTIVE')}>
                          <Ban className="h-4 w-4 mr-2" />
                          Mark Inactive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(emp.id, 'RESIGNED')}>
                          <UserX className="h-4 w-4 mr-2" />
                          Mark Resigned
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}