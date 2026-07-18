'use client';

import { useAuthStore } from '@/store/auth-store';
import { useNavStore } from '@/store/nav-store';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Users, Upload, FileText, ClipboardList, 
  BarChart3, Settings, Building2, GitBranch, UserCog,
  ChevronLeft, ChevronRight, LogOut, Moon, Sun
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

  const navItems = isSuperAdmin ? superAdminNavItems : adminNavItems;

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r bg-card h-screen sticky top-0 transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">SP</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-semibold text-sm truncate">Salary Portal</h1>
            <p className="text-xs text-muted-foreground truncate">
              {isSuperAdmin ? 'Super Admin' : user?.adminProfile?.company?.name || 'Admin'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            const Icon = item.icon;
            return (
              <button
                key={item.page}
                onClick={() => navigate(item.page as any)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-2 space-y-1">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title={collapsed ? 'Toggle theme' : undefined}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 flex-shrink-0" /> : <Moon className="h-4 w-4 flex-shrink-0" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={() => { logout(); navigate('login'); }}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <Separator className="my-1" />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}