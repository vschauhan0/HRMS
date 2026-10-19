'use client';

import { useAuthStore } from '@/store/auth-store';
import { useNavStore } from '@/store/nav-store';
import { Search, BellOff, Moon, Sun, LogOut, User, LayoutDashboard, Users, Upload, FileText, ClipboardList, BarChart3, Settings, Building2, GitBranch, UserCog, Lock, Menu, Loader2, Bell, CheckCheck, Trash2, X, CalendarCheck, LogIn, Filter } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTheme } from 'next-themes';
import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPatch, apiDelete } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { PageRoute, Notification, Company, Branch } from '@/types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  page: string;
}

export function AppTopbar() {
  const { user, logout, isSuperAdmin, isEmployee, isAdmin, selectedCompany, selectedBranch, selectCompany, selectBranch } = useAuthStore();
  const { navigate, currentPage } = useNavStore();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const fetchNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const res = await apiGet<any>('/notifications?pageSize=10');
      setNotifications(res.data || []);
    } catch { /* ignore */ } finally { setLoadingNotifs(false); }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiGet<{ count: number }>('/notifications/unread-count');
      setUnreadCount(res?.count || 0);
    } catch { /* ignore */ }
  }, []);

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
    if (isSuperAdmin()) fetchCompanies();
  }, [isSuperAdmin, fetchCompanies]);

  useEffect(() => {
    if (selectedCompany?.id) fetchBranches(selectedCompany.id);
    else setBranches([]);
  }, [selectedCompany?.id, fetchBranches]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleNotifOpen = (open: boolean) => {
    setNotifOpen(open);
    if (open) fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await apiPatch('/notifications');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      fetchUnreadCount();
    } catch { /* ignore */ }
  };

  const handleClearAll = async () => {
    try {
      await apiDelete('/notifications');
      setNotifications([]);
      fetchUnreadCount();
    } catch { /* ignore */ }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      try {
        await apiPatch(`/notifications/${n.id}/read`);
        setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
        fetchUnreadCount();
      } catch { /* ignore */ }
    }
    if (n.link) {
      navigate(n.link as PageRoute);
      setNotifOpen(false);
    }
  };

  const handleClearNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent triggering the click on the notification itself
    try {
      await apiDelete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      fetchUnreadCount();
    } catch { /* ignore */ }
  };

  const isEmployeeRole = isEmployee();

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
    { label: 'Settings', icon: Settings, page: 'settings' },
  ];

  const employeeNavItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'employee-dashboard' },
    { label: 'Attendance', icon: CalendarCheck, page: 'my-attendance' },
    { label: 'Leaves', icon: LogIn, page: 'my-leaves' },
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
      'employee-detail': 'Employee Profile',
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
      'companies': 'Companies & Branches',
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

  return (
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
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-foreground">
                      <span className="text-white font-bold text-sm">SP</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm">Salary Portal</p>
                      <p className="text-xs text-muted-foreground">
                        {isSuperAdmin() ? 'Super Admin' : user?.adminProfile?.company?.name}
                      </p>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                {/* Company / Branch filter - Super Admin only */}
                {isSuperAdmin() && (
                  <div className="px-4 py-3 border-b bg-gradient-to-b from-accent/30 to-accent/10">
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
                          <SelectTrigger className="w-full h-9 text-xs bg-background">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground mr-2" />
                            <SelectValue placeholder="All Companies" />
                          </SelectTrigger>
                          <SelectContent>
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
                          <SelectTrigger className="w-full h-9 text-xs bg-background">
                            <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground mr-2" />
                            <SelectValue placeholder={selectedCompany ? 'All Branches' : 'Select a company first'} />
                          </SelectTrigger>
                          <SelectContent>
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
                        navigate('employee-detail', { id: emp.id });
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

          {/* Notifications */}
          <DropdownMenu open={notifOpen} onOpenChange={handleNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-80 max-h-96">
              <DropdownMenuLabel className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Notifications</span>
                  {unreadCount > 0 && <span className="text-xs font-normal text-muted-foreground bg-accent px-2 py-0.5 rounded-full">{unreadCount} new</span>}
                </div>
                {notifications.length > 0 && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={handleMarkAllRead} title="Mark all as read">
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleClearAll} title="Clear all">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="overflow-y-auto max-h-72">
                {loadingNotifs ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                    <BellOff className="h-6 w-6" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`group relative px-3 py-2.5 border-b last:border-b-0 hover:bg-accent/50 transition-colors cursor-pointer ${!n.read ? 'bg-accent/20' : ''}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex items-start justify-between gap-2 pr-6">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        {!n.read && <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleClearNotification(e, n.id)}
                        title="Clear notification"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <div className="relative flex h-4 w-4 items-center justify-center">
              <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </div>
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
    </header>
  );
}