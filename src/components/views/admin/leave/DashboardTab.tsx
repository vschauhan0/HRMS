'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { apiGet } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { CheckCircle2, Clock, CalendarDays, CalendarX, Plane } from 'lucide-react';

export function DashboardTab() {
  const { selectedCompany } = useAuthStore();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const params = new URLSearchParams();
        if (selectedCompany?.id) params.set('companyId', selectedCompany.id);
        const res = await apiGet<any>(`/leave/dashboard?${params}`);
        setStats(res);
      } catch (err) {
        console.error(err);
      }
    }
    fetchStats();
  }, [selectedCompany]);

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

        <Card className="rounded-xl shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full text-blue-600">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">On Leave Today</p>
              <h3 className="text-2xl font-bold">{stats.onLeaveToday}</h3>
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

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-500" />
              Upcoming Holidays
            </h3>
            {stats.upcomingHolidays?.length > 0 ? (
              <ul className="space-y-4">
                {stats.upcomingHolidays.map((h: any) => (
                  <li key={h.id} className="flex justify-between items-center pb-3 border-b last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{h.holidayName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(h.holidayDate).toDateString()}</p>
                    </div>
                    <div className="text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md">
                      {h.companyId ? 'Company' : 'Global'}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No upcoming holidays scheduled.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
