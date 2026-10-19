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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPost, apiDelete } from '@/lib/api-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

export function HolidaysTab() {
  const { user } = useAuthStore();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ holidayName: '', holidayDate: '', companyId: 'GLOBAL', description: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await apiGet<any>('/holidays');
      setHolidays(res || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      if (user?.role === 'SUPER_ADMIN') {
        const res = await apiGet<any>('/companies');
        setCompanies(res || []);
      }
    } catch (e) {}
  };

  useEffect(() => { 
    fetchHolidays(); 
    fetchCompanies();
  }, [user]);

  const handleSave = async () => {
    if (!form.holidayName || !form.holidayDate) {
      toast.error('Name and Date are required');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        ...form,
        companyId: form.companyId === 'GLOBAL' ? null : form.companyId
      };
      await apiPost('/holidays', payload);
      toast.success('Holiday added successfully');
      setShowAdd(false);
      setForm({ holidayName: '', holidayDate: '', companyId: 'GLOBAL', description: '' });
      fetchHolidays();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await apiDelete(`/holidays/${id}`);
      toast.success('Deleted successfully');
      fetchHolidays();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Holiday Calendar</h2>
        {user?.role === 'SUPER_ADMIN' && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Holiday
          </Button>
        )}
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Holiday Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Applicable To</TableHead>
                <TableHead>Description</TableHead>
                {user?.role === 'SUPER_ADMIN' && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" /></TableCell></TableRow>
              ) : holidays.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No holidays scheduled.</TableCell></TableRow>
              ) : (
                holidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.holidayName}</TableCell>
                    <TableCell>
                      {new Date(h.holidayDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={!h.companyId ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : ''}>
                        {h.companyId ? h.company?.name || 'Specific Company' : 'All Companies (Global)'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{h.description || '—'}</TableCell>
                    {user?.role === 'SUPER_ADMIN' && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(h.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Holiday</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Holiday Name</Label>
              <Input value={form.holidayName} onChange={(e) => setForm({ ...form, holidayName: e.target.value })} placeholder="e.g., Diwali, Christmas" />
            </div>
            
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.holidayDate} onChange={(e) => setForm({ ...form, holidayDate: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Applicable To</Label>
              <Select value={form.companyId} onValueChange={(v) => setForm({ ...form, companyId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Scope" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBAL">All Companies (Global Holiday)</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={actionLoading}>
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Holiday
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
