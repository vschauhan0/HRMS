'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  FileText,
  Upload,
  FileIcon,
  UserX,
  UserMinus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuthStore } from '@/store/auth-store';
import { apiGet } from '@/lib/api-client';
import type { DashboardStats } from '@/types';

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  colorClass: string;
}

function StatCard({ icon, value, label, colorClass }: StatCardProps) {
  return (
    <Card className="rounded-xl border shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-semibold leading-tight">{value}</p>
            <p className="text-sm text-muted-foreground truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const userName = user?.adminProfile?.name || user?.email || 'Admin';

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await apiGet<DashboardStats>('/reports/dashboard');
        setStats(data);
      } catch {
        // silently fail, show zeros
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards = stats
    ? [
        {
          icon: <Users className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />,
          value: stats.totalEmployees,
          label: 'Total Employees',
          colorClass: 'bg-muted',
        },
        {
          icon: <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />,
          value: stats.activeEmployees,
          label: 'Active Employees',
          colorClass: 'bg-emerald-100 dark:bg-emerald-900/30',
        },
        {
          icon: <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />,
          value: stats.pendingRegistrations,
          label: 'Pending Registrations',
          colorClass: 'bg-amber-100 dark:bg-amber-900/30',
        },
        {
          icon: <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />,
          value: stats.pendingAppointments,
          label: 'Pending Appointments',
          colorClass: 'bg-amber-100 dark:bg-amber-900/30',
        },
        {
          icon: <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />,
          value: stats.salaryBatches,
          label: 'Salary Uploads',
          colorClass: 'bg-primary/10',
        },
        {
          icon: <FileIcon className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 dark:text-violet-400" />,
          value: stats.totalForm16,
          label: 'Total Form16',
          colorClass: 'bg-violet-100 dark:bg-violet-900/30',
        },
        {
          icon: <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />,
          value: stats.resignedEmployees,
          label: 'Resigned Employees',
          colorClass: 'bg-red-100 dark:bg-red-900/30',
        },
        {
          icon: <UserMinus className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500 dark:text-gray-400" />,
          value: stats.inactiveEmployees ?? (stats.totalEmployees - stats.activeEmployees - stats.resignedEmployees - stats.pendingRegistrations),
          label: 'Inactive Employees',
          colorClass: 'bg-gray-100 dark:bg-gray-800',
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userName}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Salary Batches</h2>
          <p className="text-sm text-muted-foreground py-8 text-center">
            View salary batches in the Salary section.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}