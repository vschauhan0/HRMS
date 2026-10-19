'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Loader2, XCircle } from 'lucide-react';
import { apiGet, apiPatch } from '@/lib/api-client';
import { STATUS_COLORS, PAGE_SIZE } from '@/lib/constants';
import { toast } from 'sonner';

export function HistoryTab() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      
      const res = await apiGet<any>(`/leaves?${params}`);
      setLeaves(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch { 
      setLeaves([]); 
    } finally { 
      setLoading(false); 
    }
  }, [page]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    setActionLoading(true);
    try {
      await apiPatch(`/leaves/${id}/cancel`);
      toast.success('Leave cancelled');
      fetchLeaves();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel leave');
    } finally {
      setActionLoading(false);
    }
  };

  function getDateRange(from: string, to: string) {
    const f = new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const t = new Date(to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (f === new Date(to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })) return f;
    return `${f} - ${t}`;
  }

  function getLeaveTypeColor(type: any) {
    if (type?.isPaid) return 'text-emerald-500';
    return 'text-blue-500';
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="rounded-xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" /></TableCell></TableRow>
              ) : leaves.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">You have no leave history.</TableCell></TableRow>
              ) : (
                leaves.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <span className={`font-medium text-sm ${getLeaveTypeColor(l.leaveType)}`}>
                        {l.leaveType?.name || l.leaveTypeString || 'Leave'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {l.totalDays} Day(s) {l.halfDay && <Badge variant="outline" className="ml-1 text-[10px]">Half</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{getDateRange(l.fromDate, l.toDate)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_COLORS[l.status] || ''}>{l.status}</Badge>
                      {l.status === 'REJECTED' && l.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={l.rejectionReason}>
                          Reason: {l.rejectionReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === 'PENDING' && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleCancel(l.id)} disabled={actionLoading}>
                          <XCircle className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} &middot; {total} total</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
