'use client';

import { useAuthStore } from '@/store/auth-store';
import { useNavStore } from '@/store/nav-store';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FileText, User, MoreHorizontal } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LogOut, Settings, Lock, Building2 } from 'lucide-react';
import type { PageRoute } from '@/types';

export function BottomNav() {
  const { user, isEmployee, logout } = useAuthStore();
  const { navigate, currentPage } = useNavStore();

  const isEmp = isEmployee();

  if (!isEmp) return null;

  const tabs = [
    { label: 'Dashboard', icon: LayoutDashboard, page: 'employee-dashboard' as PageRoute },
    { label: 'Salary', icon: FileText, page: 'my-salary' as PageRoute },
    { label: 'Profile', icon: User, page: 'my-profile' as PageRoute },
    { label: 'More', icon: MoreHorizontal, page: 'more' as PageRoute },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentPage === tab.page;

            if (tab.page === 'more') {
              return (
                <Sheet key="more">
                  <SheetTrigger asChild>
                    <button
                      className={cn(
                        'flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors min-w-[4rem]',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] font-medium">{tab.label}</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh]">
                    <SheetHeader className="text-left">
                      <SheetTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-primary-foreground font-bold text-sm">
                            {user?.employee?.firstName?.[0]}{user?.employee?.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold">{user?.employee?.firstName} {user?.employee?.lastName}</p>
                          <p className="text-sm text-muted-foreground">{user?.employee?.employeeCode}</p>
                        </div>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-1">
                      <button
                        onClick={() => navigate('employee-dashboard')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm hover:bg-accent transition-colors"
                      >
                        <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => navigate('my-salary')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm hover:bg-accent transition-colors"
                      >
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        Salary Slips
                      </button>
                      <button
                        onClick={() => navigate('my-form16')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm hover:bg-accent transition-colors"
                      >
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        Form 16
                      </button>
                      <button
                        onClick={() => navigate('my-profile')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm hover:bg-accent transition-colors"
                      >
                        <User className="h-5 w-5 text-muted-foreground" />
                        My Profile
                      </button>
                      <button
                        onClick={() => navigate('change-password')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm hover:bg-accent transition-colors"
                      >
                        <Lock className="h-5 w-5 text-muted-foreground" />
                        Change Password
                      </button>
                      <Separator className="my-2" />
                      <button
                        onClick={() => navigate('settings')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm hover:bg-accent transition-colors"
                      >
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        Settings
                      </button>
                      <button
                        onClick={() => { logout(); navigate('login'); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <LogOut className="h-5 w-5" />
                        Logout
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }

            return (
              <button
                key={tab.page}
                onClick={() => navigate(tab.page)}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors min-w-[4rem]',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}