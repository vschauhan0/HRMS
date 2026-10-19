'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { apiGet, apiPost, apiDelete } from '@/lib/api-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

export function LeaveTypesTab() {
  const { user } = useAuthStore();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', isPaid: false, annualLimit: '12 Days', description: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await apiGet<any>('/leave/types');
      setTypes(res || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load leave types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTypes(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.annualLimit) {
      toast.error('Name and limit are required');
      return;
    }
    setActionLoading(true);
    try {
      await apiPost('/leave/types', form);
      toast.success('Leave Type added successfully');
      setShowAdd(false);
      setForm({ name: '', isPaid: false, annualLimit: '12 Days', description: '' });
      fetchTypes();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave type?')) return;
    try {
      await apiDelete(`/leave/types/${id}`);
      toast.success('Deleted successfully');
      fetchTypes();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-muted-foreground">Only Super Admins can manage leave types.</div>;
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-end">
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Leave Type
        </Button>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Type</TableHead>
                <TableHead>Paid Status</TableHead>
                <TableHead>Annual Limit</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" /></TableCell></TableRow>
              ) : types.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No leave types configured.</TableCell></TableRow>
              ) : (
                types.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant={t.isPaid ? 'default' : 'secondary'} className={t.isPaid ? 'bg-emerald-100 text-emerald-800' : ''}>
                        {t.isPaid ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.annualLimit}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{t.description || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Leave Type</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name (e.g., Casual Leave)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex items-center justify-between border p-3 rounded-lg">
              <div>
                <Label className="text-base">Is Paid Leave?</Label>
                <p className="text-xs text-muted-foreground">Will not deduct from payroll</p>
              </div>
              <Switch checked={form.isPaid} onCheckedChange={(c) => setForm({ ...form, isPaid: c })} />
            </div>
            <div className="space-y-2">
              <Label>Annual Limit (e.g., '12 Days', 'Unlimited')</Label>
              <Input value={form.annualLimit} onChange={(e) => setForm({ ...form, annualLimit: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={actionLoading}>
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Type
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
