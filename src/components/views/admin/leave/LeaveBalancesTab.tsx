'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiGet, apiPost } from '@/lib/api-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

export function LeaveBalancesTab() {
  const { selectedCompany } = useAuthStore();
  const [balances, setBalances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  
  const [form, setForm] = useState({ employeeId: '', leaveTypeId: '', allocatedDays: 0, year: new Date().getFullYear() });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await apiGet<any>('/leave/balances');
      setBalances(res || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load balances');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const p = new URLSearchParams();
      p.set('pageSize', '500');
      if (selectedCompany?.id) p.set('companyId', selectedCompany.id);
      
      const [empRes, typeRes] = await Promise.all([
        apiGet<any>(`/employees?${p}`),
        apiGet<any>('/leave/types')
      ]);
      setEmployees(empRes.data || []);
      setLeaveTypes(typeRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { 
    fetchBalances(); 
    fetchDropdowns();
  }, [selectedCompany]);

  const handleSave = async () => {
    if (!form.employeeId || !form.leaveTypeId || form.allocatedDays === undefined || !form.year) {
      toast.error('All fields are required');
      return;
    }
    setActionLoading(true);
    try {
      await apiPost('/leave/balances/assign', form);
      toast.success('Leave balance assigned successfully');
      setShowAdd(false);
      fetchBalances();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Employee Leave Balances</h2>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" /> Assign Balance
        </Button>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead className="text-center">Year</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" /></TableCell></TableRow>
              ) : balances.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No leave balances assigned yet.</TableCell></TableRow>
              ) : (
                balances.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{b.employee?.firstName} {b.employee?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{b.employee?.employeeCode}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={b.leaveType?.isPaid ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-700'}>
                        {b.leaveType?.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">{b.year}</TableCell>
                    <TableCell className="text-right font-medium">{b.allocatedDays}</TableCell>
                    <TableCell className="text-right text-rose-600">{b.usedDays}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">{b.remainingDays}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Leave Balance</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={form.leaveTypeId} onValueChange={(v) => setForm({ ...form, leaveTypeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Leave Type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Allocated Days</Label>
                <Input type="number" step="0.5" min="0" value={form.allocatedDays} onChange={(e) => setForm({ ...form, allocatedDays: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || new Date().getFullYear() })} />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={actionLoading}>
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Assign Balance
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
