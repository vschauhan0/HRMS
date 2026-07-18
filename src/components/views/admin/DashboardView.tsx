'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserPlus,
  FileText,
  Upload,
  FileIcon,
  UserX,
  UserMinus,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAuthStore } from '@/store/auth-store';
import { apiGet } from '@/lib/api-client';
import type { DashboardStats, Company } from '@/types';

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  gradient: string;
  delay: number;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <>{display}</>;
}

function StatCard({ icon, value, label, gradient, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: delay * 0.06 }}
    >
      <Card className="card-premium group rounded-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm transition-transform duration-300 group-hover:scale-110 ${gradient}`}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                <AnimatedNumber value={value} />
              </p>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
                {label}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 200, damping: 20, delay: i * 0.04 },
  }),
};

export default function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const { user, isSuperAdmin } = useAuthStore();

  const userName = user?.adminProfile?.name
    || (user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : null)
    || user?.email || 'Admin';

  // Fetch companies for super admin
  useEffect(() => {
    if (isSuperAdmin()) {
      apiGet<Company[]>('/companies').then((res) => {
        setCompanies(Array.isArray(res) ? res : []);
      }).catch(() => {});
    }
  }, [isSuperAdmin]);

  // Fetch dashboard stats
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (companyFilter !== 'ALL') {
          params.set('companyId', companyFilter);
        }
        const query = params.toString() ? `?${params.toString()}` : '';
        const data = await apiGet<DashboardStats>(`/reports/dashboard${query}`);
        setStats(data);
      } catch {
        // silently fail, show zeros
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [companyFilter]);

  const statCards = stats
    ? [
        {
          icon: <Users className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600 dark:text-slate-300" />,
          value: stats.totalEmployees,
          label: 'Total Employees',
          gradient: 'from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700',
        },
        {
          icon: <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />,
          value: stats.activeEmployees,
          label: 'Active Employees',
          gradient: 'from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40',
        },
        {
          icon: <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" />,
          value: stats.pendingRegistrations,
          label: 'Pending Registrations',
          gradient: 'from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40',
        },
        {
          icon: <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />,
          value: stats.pendingAppointments,
          label: 'Pending Appointments',
          gradient: 'from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40',
        },
        {
          icon: <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600 dark:text-slate-300" />,
          value: stats.salaryBatches,
          label: 'Salary Uploads',
          gradient: 'from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700',
        },
        {
          icon: <FileIcon className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600 dark:text-violet-400" />,
          value: stats.totalForm16,
          label: 'Total Form16',
          gradient: 'from-violet-100 to-violet-200 dark:from-violet-900/40 dark:to-violet-800/40',
        },
        {
          icon: <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />,
          value: stats.resignedEmployees,
          label: 'Resigned Employees',
          gradient: 'from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40',
        },
        {
          icon: <UserMinus className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500 dark:text-gray-400" />,
          value: stats.inactiveEmployees ?? (stats.totalEmployees - stats.activeEmployees - stats.resignedEmployees - stats.pendingRegistrations),
          label: 'Inactive Employees',
          gradient: 'from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700',
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Overview</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Welcome back, <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">{userName}</span>
          </h1>
        </div>

        {isSuperAdmin() && companies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
          >
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="h-9 w-[220px] rounded-xl border-border/50 bg-card/50 backdrop-blur-sm">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        )}
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, i) => (
          <StatCard key={card.label} {...card} delay={i} />
        ))}
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
      >
        <Card className="card-premium rounded-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Salary Batches
              </h2>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                View salary batches in the Salary section.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}