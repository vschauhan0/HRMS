'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { apiGet } from '@/lib/api-client';
import { CheckCircle2, Clock, CalendarX, Plane } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, balRes] = await Promise.all([
          apiGet<any>(`/leave/dashboard`),
          apiGet<any>('/leave/balances')
        ]);
        setStats(statsRes);
        setBalances(balRes || []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  if (!stats) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading dashboard...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-xl shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pending</p>
              <h3 className="text-2xl font-bold">{stats.pendingRequests}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-full text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Approved</p>
              <h3 className="text-2xl font-bold">{stats.approvedRequests}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm border-l-4 border-l-rose-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/20 rounded-full text-rose-600">
              <CalendarX className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Rejected</p>
              <h3 className="text-2xl font-bold">{stats.rejectedRequests}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-lg font-semibold mt-8 mb-4">My Leave Balances</h3>
      <div className="grid md:grid-cols-3 gap-6">
        {balances.length === 0 ? (
          <p className="text-muted-foreground col-span-3">No leave balances assigned yet.</p>
        ) : (
          balances.map(b => {
            const pct = b.allocatedDays > 0 ? (b.usedDays / b.allocatedDays) * 100 : 0;
            return (
              <Card key={b.id} className="rounded-xl shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">{b.leaveType?.name}</h4>
                    <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">{b.year}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Used: {b.usedDays}</span>
                    <span className="font-bold text-emerald-600">Remaining: {b.remainingDays}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  );
}
