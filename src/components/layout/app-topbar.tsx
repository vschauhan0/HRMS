'use client';

import { useAuthStore } from '@/store/auth-store';
import { useNavStore } from '@/store/nav-store';
import { Search, Bell, Moon, Sun, LogOut, User, LayoutDashboard, Users, Upload, FileText, ClipboardList, BarChart3, Settings, Building2, GitBranch, UserCog, Lock, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { apiGet } from '@/lib/api-client';
import type { PageRoute } from '@/types';
import { CompanySwitcher } from '@/components/layout/company-switcher';

interface NavItem {
  label: string;
  icon: React.ElementType;
  page: string;
}

export function AppTopbar() {
  const { user, logout, isSuperAdmin, isEmployee, selectedCompany } = useAuthStore();
  const { navigate, currentPage } = useNavStore();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const isEmployeeRole = isEmployee();

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

  const employeeNavItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'employee-dashboard' },
    { label: 'Salary Slips', icon: FileText, page: 'my-salary' },
    { label: 'Form 16', icon: FileText, page: 'my-form16' },
    { label: 'Profile', icon: User, page: 'my-profile' },
    { label: 'Change Password', icon: Lock, page: 'change-password' },
  ];

  const navItems = isEmployeeRole 
    ? employeeNavItems 
    : isSuperAdmin() 
      ? superAdminNavItems 
      : adminNavItems;

  const getPageTitle = () => {
    if (isEmployeeRole) {
      const titles: Record<string, string> = {
        'employee-dashboard': 'Dashboard',
        'my-salary': 'Salary Slips',
        'my-form16': 'Form 16',
        'my-profile': 'My Profile',
        'change-password': 'Change Password',
      };
      return titles[currentPage] || 'Dashboard';
    }
    const titles: Record<string, string> = {
      'admin-dashboard': 'Dashboard',
      'employees': 'Employees',
      'employee-add': 'Add Employee',
      'employee-edit': 'Edit Employee',
      'employee-import': 'Import Employees',
      'salary': 'Salary Management',
      'salary-upload': 'Upload Salary',
      'salary-batch-detail': 'Salary Batch',
      'salary-slips': 'Salary Slips',
      'form16': 'Form 16',
      'form16-upload': 'Upload Form 16',
      'appointments': 'Appointments',
      'appointment-detail': 'Appointment Details',
      'reports': 'Reports',
      'settings': 'Settings',
      'companies': 'Companies',
      'branches': 'Branches',
      'admins': 'Admin Users',
      'admin-add': 'Add Admin',
    };
    return titles[currentPage] || 'Dashboard';
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await apiGet(`/employees/search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data || []);
      setShowSearch(true);
    } catch {
      setSearchResults([]);
    }
  };

  const getUserInitials = () => {
    if (isEmployeeRole && user?.employee) {
      return `${user.employee.firstName[0]}${user.employee.lastName[0]}`;
    }
    if (user?.adminProfile?.name) {
      return user.adminProfile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'AD';
  };

  const getUserName = () => {
    if (isEmployeeRole && user?.employee) {
      return `${user.employee.firstName} ${user.employee.lastName}`;
    }
    return user?.adminProfile?.name || 'Admin';
  };

  const getRoleLabel = () => {
    if (user?.role === 'SUPER_ADMIN') return 'Super Admin';
    if (user?.role === 'ADMIN') return 'Admin';
    return 'Employee';
  };

  const showCompanyAccent = !isEmployeeRole && selectedCompany;

  return (
    <>
      {/* Company Accent Bar - shows when a company is selected */}
      {showCompanyAccent && (
        <div className="company-accent-bar" />
      )}

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6">
          {/* Left: Mobile menu + Page title */}
          <div className="flex items-center gap-3">
            {/* Mobile: Sheet menu for admin, show brand for employee */}
            {!isEmployeeRole && (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300"
                        style={{
                          backgroundColor: selectedCompany?.themeColor || 'var(--foreground)',
                        }}
                      >
                        <span className="text-white font-bold text-sm">
                          {(selectedCompany?.name || 'SP').split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm">
                          {selectedCompany?.name || 'Salary Portal'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isSuperAdmin() ? 'Super Admin' : user?.adminProfile?.company?.name}
                        </p>
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="p-2 space-y-1">
                    {navItems.map((item) => {
                      const isActive = currentPage === item.page;
                      return (
                        <button
                          key={item.page}
                          onClick={() => { navigate(item.page as PageRoute); setSheetOpen(false); }}
                          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
            )}
            <h2 className="text-lg font-semibold truncate">{getPageTitle()}</h2>
          </div>

          {/* Center: Company Switcher (Super Admin only) */}
          {isSuperAdmin() && (
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
              <CompanySwitcher />
            </div>
          )}

          {/* Right: Search, theme, notifications, profile */}
          <div className="flex items-center gap-2">
            {/* Search - only for admin */}
            {!isEmployeeRole && (
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-9 w-48 lg:w-64 h-9"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                  onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                />
                {showSearch && searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-card border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {searchResults.map((emp: any) => (
                      <button
                        key={emp.id}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between"
                        onMouseDown={() => {
                          navigate('employee-edit', { id: emp.id });
                          setShowSearch(false);
                          setSearchQuery('');
                        }}
                      >
                        <div>
                          <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-muted-foreground">{emp.employeeCode} · {emp.designation}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{emp.branch?.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2 gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium max-w-32 truncate">
                    {getUserName()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <div>
                    <p className="text-sm font-medium">{getUserName()}</p>
                    <p className="text-xs text-muted-foreground">{getRoleLabel()}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isEmployeeRole ? (
                  <>
                    <DropdownMenuItem onClick={() => navigate('my-profile')}>
                      <User className="mr-2 h-4 w-4" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('change-password')}>
                      Settings
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => navigate('settings')}>
                      <User className="mr-2 h-4 w-4" /> Settings
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => { logout(); navigate('login'); }}
                  className="text-red-500 focus:text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile company switcher (below topbar) */}
        {isSuperAdmin() && (
          <div className="md:hidden px-4 pb-2">
            <CompanySwitcher />
          </div>
        )}
      </header>
    </>
  );
}