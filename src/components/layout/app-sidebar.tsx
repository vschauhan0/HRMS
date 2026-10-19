'use client';

import { useAuthStore } from '@/store/auth-store';
import { useNavStore } from '@/store/nav-store';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Users, Upload, FileText, ClipboardList, 
  BarChart3, Settings, Building2, GitBranch, UserCog,
  ChevronLeft, ChevronRight, LogOut, Moon, Sun, Briefcase,
  CalendarCheck, LogIn, User, Lock, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from 'next-themes';
import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/lib/api-client';
import type { Company, Branch } from '@/types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  page: string;
}

function NidhiHrmsLogo({ className }: { className?: string }) {
  const userAngles = [0, 51.43, 102.86, 154.29, 205.71, 257.14, 308.57];

  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Central Handle at Bottom */}
      <rect x="94" y="148" width="12" height="26" rx="4" fill="currentColor" />

      {/* Outer Circle */}
      <circle cx="100" cy="100" r="52" stroke="currentColor" strokeWidth="7" fill="none" />

      {/* Inner Circle / Border */}
      <circle cx="100" cy="100" r="44" stroke="currentColor" strokeWidth="2" fill="none" />

      {/* Radiating Lines & User Icons */}
      {userAngles.map((angleDeg, idx) => {
        const rad = (angleDeg - 90) * (Math.PI / 180);
        const x1 = 100 + 52 * Math.cos(rad);
        const y1 = 100 + 52 * Math.sin(rad);
        const x2 = 100 + 70 * Math.cos(rad);
        const y2 = 100 + 70 * Math.sin(rad);

        const ux = 100 + 84 * Math.cos(rad);
        const uy = 100 + 84 * Math.sin(rad);

        return (
          <g key={idx}>
            {/* Connecting Line */}
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />

            {/* User Head */}
            <circle cx={ux} cy={uy - 4} r="4.5" stroke="currentColor" strokeWidth="3" fill="none" />

            {/* User Body / Shoulders */}
            <path
              d={`M ${ux - 7} ${uy + 6} C ${ux - 7} ${uy + 1}, ${ux + 7} ${uy + 1}, ${ux + 7} ${uy + 6} Z`}
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      {/* Nidhi Impex Image in Center */}
      <foreignObject x="58" y="58" width="84" height="84">
        <div className="w-full h-full flex items-center justify-center rounded-full overflow-hidden bg-white p-1 shadow-inner">
          <img src="/nidhi_impex_logo.png" alt="Nidhi Impex" className="w-full h-full object-contain" />
        </div>
      </foreignObject>
    </svg>
  );
}

export function AppSidebar() {
  const { user, logout, isSuperAdmin, selectedCompany, selectedBranch, selectCompany, selectBranch } = useAuthStore();
  const { navigate, currentPage } = useNavStore();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const isEmployee = user?.role === 'EMPLOYEE';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await apiGet<Company[]>('/companies');
      setCompanies(data || []);
    } catch { /* ignore */ }
  }, []);

  const fetchBranches = useCallback(async (companyId: string) => {
    try {
      const data = await apiGet<Branch[]>(`/branches?companyId=${companyId}&pageSize=100`);
      setBranches(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch { setBranches([]); }
  }, []);

  useEffect(() => {
    if (isSuperAdmin() && !collapsed) fetchCompanies();
  }, [isSuperAdmin, collapsed, fetchCompanies]);

  useEffect(() => {
    if (selectedCompany?.id) fetchBranches(selectedCompany.id);
    else setBranches([]);
  }, [selectedCompany?.id, fetchBranches]);

  const isProfileComplete = user?.employee ? user.employee.profileCompleted : false;

  const employeeNavItems: NavItem[] = isProfileComplete ? [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'employee-dashboard' },
    { label: 'Attendance', icon: CalendarCheck, page: 'my-attendance' },
    { label: 'Leaves', icon: LogIn, page: 'my-leaves' },
    { label: 'Salary', icon: FileText, page: 'my-salary' },
    { label: 'Form 16', icon: FileText, page: 'my-form16' },
    { label: 'Profile', icon: User, page: 'my-profile' },
    { label: 'Change Password', icon: Lock, page: 'change-password' },
  ] : [
    { label: 'Profile', icon: User, page: 'my-profile' },
    { label: 'Change Password', icon: Lock, page: 'change-password' },
  ];

  const superAdminNavItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'admin-dashboard' },
    { label: 'Companies & Branches', icon: Building2, page: 'companies' },
    { label: 'Admins', icon: UserCog, page: 'admins' },
    { label: 'Employees', icon: Users, page: 'employees' },
    { label: 'Attendance', icon: CalendarCheck, page: 'attendance' },
    { label: 'Leaves', icon: LogIn, page: 'leaves' },
    { label: 'Salary', icon: Upload, page: 'salary' },
    { label: 'Form 16', icon: FileText, page: 'form16' },
    { label: 'Appointments', icon: ClipboardList, page: 'appointments' },
    { label: 'Reports', icon: BarChart3, page: 'reports' },
    { label: 'Settings', icon: Settings, page: 'settings' },
  ];

  const adminNavItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'admin-dashboard' },
    { label: 'Employees', icon: Users, page: 'employees' },
    { label: 'Attendance', icon: CalendarCheck, page: 'attendance' },
    { label: 'Leaves', icon: LogIn, page: 'leaves' },
    { label: 'Salary', icon: Upload, page: 'salary' },
    { label: 'Form 16', icon: FileText, page: 'form16' },
    { label: 'Appointments', icon: ClipboardList, page: 'appointments' },
    { label: 'Reports', icon: BarChart3, page: 'reports' },
    { label: 'Profile', icon: User, page: 'my-profile' },
    { label: 'Change Password', icon: Lock, page: 'change-password' },
    { label: 'Settings', icon: Settings, page: 'settings' },
  ];

  const navItems = isEmployee ? employeeNavItems : (isSuperAdmin() ? superAdminNavItems : adminNavItems);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300 ease-out',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      <div className="absolute inset-y-0 right-0 w-px bg-border/50" />

      <div className="flex flex-1 flex-col">
        {/* Logo / Brand */}
        <div className={cn(
          'flex items-center border-b border-border/50 p-4 transition-all duration-300',
          collapsed ? 'justify-center' : 'gap-3'
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground shadow-sm p-0.5 overflow-hidden">
            <NidhiHrmsLogo className="h-full w-full text-background" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden animate-fade-in">
              <h1 className="font-semibold text-sm tracking-tight truncate">
                {isEmployee ? `${user?.employee?.firstName} ${user?.employee?.lastName}` : isSuperAdmin() ? (selectedCompany?.name || 'All Companies') : user?.adminProfile?.company?.name || 'Salary Portal'}
              </h1>
              <p className="text-[11px] text-muted-foreground truncate">
                {isEmployee ? 'Employee' : isSuperAdmin() ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          )}
        </div>

        {/* Company / Branch filter - Super Admin only */}
        {isSuperAdmin() && !collapsed && (
          <div className="px-3 pt-3 pb-3 border-b border-border/50 bg-gradient-to-b from-accent/30 to-accent/10">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filters</span>
            </div>
            <div className="space-y-2.5 w-full">
              <div className="w-full">
                <Select value={selectedCompany?.id || 'all'} onValueChange={(v) => {
                  if (v === 'all') { selectCompany(null); selectBranch(null); }
                  else { const c = companies.find(c => c.id === v); if (c) selectCompany(c); }
                }}>
                  <SelectTrigger className="w-full h-9 text-xs bg-background border-muted-foreground/20 shadow-sm">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full">
                <Select 
                  value={selectedBranch?.id || (selectedCompany ? 'all' : '__none')} 
                  onValueChange={(v) => {
                    if (v === 'all') selectBranch(null);
                    else { const b = branches.find(b => b.id === v); if (b) selectBranch(b); }
                  }}
                  disabled={!selectedCompany}
                >
                  <SelectTrigger className="w-full h-9 text-xs bg-background border-muted-foreground/20 shadow-sm">
                    <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder={selectedCompany ? 'All Branches' : 'Select Company first'} />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {selectedCompany ? (
                      <>
                        <SelectItem value="all">All Branches</SelectItem>
                        {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </>
                    ) : (
                      <SelectItem value="__none" disabled>Select a company first</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-0.5 px-3">
            {navItems.map((item, index) => {
              const isActive = currentPage === item.page;
              const Icon = item.icon;
              return (
                <button
                  key={item.page}
                  onClick={() => navigate(item.page as any)}
                  className={cn(
                    'group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Hover background */}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-xl bg-foreground/0 transition-colors duration-200 group-hover:bg-accent" />
                  )}
                  
                  <Icon className={cn(
                    'relative h-4.5 w-4.5 shrink-0 transition-transform duration-200',
                    !isActive && 'group-hover:scale-110'
                  )} />
                  {!collapsed && (
                    <span className="relative truncate">{item.label}</span>
                  )}

                  {/* Active indicator bar */}
                  {isActive && !collapsed && (
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border/50 p-2.5 space-y-0.5">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={cn(
              'group w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? 'Toggle theme' : undefined}
          >
            <div className="relative flex h-4 w-4 items-center justify-center shrink-0">
              <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </div>
            {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button
            onClick={() => { logout(); navigate('login'); }}
            className={cn(
              'group w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5 duration-200" />
            {!collapsed && <span>Logout</span>}
          </button>
          <Separator className="my-1.5 bg-border/50" />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}