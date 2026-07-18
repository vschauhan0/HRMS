'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api-client';
import type { AdminProfile, Company } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ShieldCheck, Plus, Phone, Mail, UserCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function AdminListView() {
  const { selectedCompany } = useAuthStore();
  const [admins, setAdmins] = useState<(AdminProfile & { company?: Company; email?: string })[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany?.id) params.set('companyId', selectedCompany.id);
      const res = await apiGet<(AdminProfile & { company?: Company; email?: string })[]>(`/admins?${params.toString()}`);
      setAdmins(res || []);
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await apiGet<Company[]>('/companies');
      setCompanies(Array.isArray(res) ? res : (res as any)?.data || []);
    } catch {
      setCompanies([]);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchCompanies();
  }, [selectedCompany]);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !companyId) {
      toast.error('Please fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      await apiPost('/admins', {
        name: name.trim(),
        email: email.trim(),
        password,
        mobile: mobile.trim() || null,
        companyId,
      });
      toast.success('Admin user created successfully');
      setDialogOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setMobile('');
      setCompanyId('');
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage admin accounts</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Admin User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="admin-name">Name</Label>
                <Input
                  id="admin-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-mobile">Mobile</Label>
                <Input
                  id="admin-mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Mobile number (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
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

      {/* Content */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : admins.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No admin users found. Create the first admin.</p>
            </div>
          ) : (
            <>
              {/* Mobile: Card list */}
              <div className="block sm:hidden divide-y">
                {admins.map((admin) => (
                  <div key={admin.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{admin.name}</p>
                        {admin.email && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{admin.email}</span>
                          </div>
                        )}
                        {admin.mobile && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{admin.mobile}</span>
                          </div>
                        )}
                        {admin.company && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {admin.company.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Mobile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.name}</TableCell>
                        <TableCell>{admin.email || '—'}</TableCell>
                        <TableCell>{admin.company?.name || '—'}</TableCell>
                        <TableCell>{admin.mobile || '—'}</TableCell>
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