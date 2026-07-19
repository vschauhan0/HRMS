'use client';

import { useAuthStore } from '@/store/auth-store';
import { useNavStore } from '@/store/nav-store';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Users, Upload, FileText, ClipboardList, 
  BarChart3, Settings, Building2, GitBranch, UserCog,
  ChevronLeft, ChevronRight, LogOut, Moon, Sun, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTheme } from 'next-themes';
import { useState } from 'react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  page: string;
}

export function AppSidebar() {
  const { user, logout, isSuperAdmin } = useAuthStore();
  const { navigate, currentPage } = useNavStore();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const isEmployee = user?.role === 'EMPLOYEE';

  if (isEmployee) return null;

  const superAdminNavItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'admin-dashboard' },
    { label: 'Companies', icon: Building2, page: 'companies' },
    { label: 'Branches', icon: GitBranch, page: 'branches' },
    { label: 'Admins', icon: UserCog, page: 'admins' },
    { label: 'Employees', icon: Users, page: 'employees' },
    { label: 'Salary', icon: Upload, page: 'salary' },
    { label: 'Form 16', icon: FileText, page: 'form16' },
    { label: 'Appointments', icon: ClipboardList, page: 'appointments' },
    { label: 'Reports', icon: BarChart3, page: 'reports' },
    { label: 'Settings', icon: Settings, page: 'settings' },
  ];

  const adminNavItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'admin-dashboard' },
    { label: 'Employees', icon: Users, page: 'employees' },
    { label: 'Salary', icon: Upload, page: 'salary' },
    { label: 'Form 16', icon: FileText, page: 'form16' },
    { label: 'Appointments', icon: ClipboardList, page: 'appointments' },
    { label: 'Reports', icon: BarChart3, page: 'reports' },
    { label: 'Settings', icon: Settings, page: 'settings' },
  ];

  const navItems = isSuperAdmin() ? superAdminNavItems : adminNavItems;

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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground shadow-sm">
            <Sparkles className="text-white h-4.5 w-4.5" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden animate-fade-in">
              <h1 className="font-semibold text-sm tracking-tight truncate">
                {isSuperAdmin() ? 'Salary Portal' : user?.adminProfile?.company?.name || 'Salary Portal'}
              </h1>
              <p className="text-[11px] text-muted-foreground truncate">
                {isSuperAdmin() ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          )}
        </div>

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
            {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-45 duration-300" /> : <Moon className="h-4 w-4 shrink-0 transition-transform group-hover:-rotate-12 duration-300" />}
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