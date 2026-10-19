'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiGet, apiPost } from '@/lib/api-client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function ApplyTab({ onApplied }: { onApplied: () => void }) {
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [form, setForm] = useState({
    leaveTypeId: '',
    fromDate: '',
    toDate: '',
    halfDay: false,
    reason: ''
  });

  useEffect(() => {
    async function fetchTypes() {
      setLoading(true);
      try {
        const res = await apiGet<any>('/leave/types');
        setLeaveTypes(res?.filter((t: any) => t.status) || []);
      } catch (e) {
        toast.error('Failed to load leave types');
      } finally {
        setLoading(false);
      }
    }
    fetchTypes();
  }, []);

  const calculateDays = () => {
    if (!form.fromDate || !form.toDate) return 0;
    const from = new Date(form.fromDate);
    const to = new Date(form.toDate);
    if (to < from) return 0;
    
    // Basic calculation, without checking weekends yet, but could be enhanced
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (form.halfDay && diffDays === 1) return 0.5;
    return diffDays;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leaveTypeId || !form.fromDate || !form.toDate || !form.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    const totalDays = calculateDays();
    if (totalDays <= 0) {
      toast.error('Invalid date range');
      return;
    }

    setActionLoading(true);
    try {
      await apiPost('/leaves', {
        ...form,
        totalDays
      });
      toast.success('Leave applied successfully');
      setForm({ leaveTypeId: '', fromDate: '', toDate: '', halfDay: false, reason: '' });
      onApplied();
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply leave');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Card className="rounded-xl shadow-sm max-w-2xl mx-auto">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-6">Apply for Leave</h2>
        
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={form.leaveTypeId} onValueChange={(v) => setForm({ ...form, leaveTypeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Leave Type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.isPaid ? '(Paid)' : '(Unpaid)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input 
                  type="date" 
                  value={form.fromDate} 
                  onChange={(e) => setForm({ ...form, fromDate: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input 
                  type="date" 
                  value={form.toDate} 
                  onChange={(e) => setForm({ ...form, toDate: e.target.value })} 
                  min={form.fromDate}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border p-4 rounded-lg bg-muted/30">
              <div>
                <Label className="text-base">Half Day</Label>
                <p className="text-xs text-muted-foreground">Applies only if date range is 1 day</p>
              </div>
              <Switch 
                checked={form.halfDay} 
                onCheckedChange={(c) => setForm({ ...form, halfDay: c })} 
                disabled={form.fromDate && form.toDate && form.fromDate !== form.toDate ? true : false}
              />
            </div>

            <div className="bg-indigo-50 text-indigo-700 p-3 rounded-md text-sm font-medium">
              Total Days: {calculateDays()}
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea 
                placeholder="Briefly describe the reason for your leave..." 
                rows={3} 
                value={form.reason} 
                onChange={(e) => setForm({ ...form, reason: e.target.value })} 
              />
            </div>

            <Button type="submit" disabled={actionLoading} className="w-full">
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit Application
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
