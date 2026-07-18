'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '@/lib/api-client';
import type { Branch, Company, PaginatedResponse } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { GitBranch, Plus, Building2, Filter } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function BranchListView() {
  const { selectedCompany, isSuperAdmin } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filters
  const [companyFilter, setCompanyFilter] = useState<string>(selectedCompany?.id || 'all');

  // Dialog form
  const [formCompanyId, setFormCompanyId] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('pageSize', '200');
      if (companyFilter !== 'all') params.set('companyId', companyFilter);
      const res = await apiGet<Branch[]>(`/branches?${params.toString()}`);
      setBranches(Array.isArray(res) ? res : (res as any)?.data || []);
    } catch {
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [companyFilter, selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const res = await apiGet<Company[]>('/companies?pageSize=200');
      setCompanies(Array.isArray(res) ? res : (res as any)?.data || []);
    } catch {
      setCompanies([]);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleCreate = async () => {
    if (!formCompanyId || !branchName.trim() || !branchCode.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setCreating(true);
    try {
      await apiPost('/branches', {
        companyId: formCompanyId,
        name: branchName.trim(),
        code: branchCode.trim().toUpperCase(),
      });
      toast.success('Branch created successfully');
      setDialogOpen(false);
      setBranchName('');
      setBranchCode('');
      setFormCompanyId('');
      fetchBranches();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create branch');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Branches</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage company branches</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Branch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={formCompanyId} onValueChange={setFormCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-name">Branch Name</Label>
                <Input
                  id="branch-name"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Enter branch name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-code">Branch Code</Label>
                <Input
                  id="branch-code"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  placeholder="e.g., HQ"
                  maxLength={10}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Company Filter */}
      {companies.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Filter by company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : branches.length === 0 ? (
            <div className="py-16 text-center">
              <GitBranch className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No branches found.</p>
            </div>
          ) : (
            <>
              {/* Mobile: Card list */}
              <div className="block sm:hidden divide-y">
                {branches.map((branch) => (
                  <div key={branch.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <GitBranch className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{branch.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{branch.code}</p>
                        </div>
                      </div>
                      <Badge variant={branch.status ? 'default' : 'secondary'}>
                        {branch.status ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {branch.company && (
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{branch.company.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Branch Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((branch) => (
                      <TableRow key={branch.id}>
                        <TableCell>{branch.company?.name || '—'}</TableCell>
                        <TableCell className="font-medium">{branch.name}</TableCell>
                        <TableCell className="font-mono text-xs">{branch.code}</TableCell>
                        <TableCell>
                          <Badge variant={branch.status ? 'default' : 'secondary'}>
                            {branch.status ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(branch.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}