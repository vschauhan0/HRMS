'use client';

import { useAuthStore } from '@/store/auth-store';
import { useNavStore } from '@/store/nav-store';
import { AnimatePresence, motion } from 'framer-motion';
import type { PageRoute } from '@/types';

// Auth Views
import LoginView from '@/components/views/auth/LoginView';
import RegisterView from '@/components/views/auth/RegisterView';
import ForgotPasswordView from '@/components/views/auth/ForgotPasswordView';

// Public Views
import AppointmentFormView from '@/components/views/public/AppointmentFormView';
import TrackApplicationView from '@/components/views/public/TrackApplicationView';

// Admin Views
import DashboardView from '@/components/views/admin/DashboardView';
import EmployeeListView from '@/components/views/admin/EmployeeListView';
import EmployeeFormView from '@/components/views/admin/EmployeeFormView';
import EmployeeImportView from '@/components/views/admin/EmployeeImportView';
import SalaryView from '@/components/views/admin/SalaryView';
import SalaryUploadView from '@/components/views/admin/SalaryUploadView';
import SalaryBatchDetailView from '@/components/views/admin/SalaryBatchDetailView';
import SalarySlipsView from '@/components/views/admin/SalarySlipsView';
import Form16View from '@/components/views/admin/Form16View';
import AppointmentListView from '@/components/views/admin/AppointmentListView';
import AppointmentDetailView from '@/components/views/admin/AppointmentDetailView';
import ReportsView from '@/components/views/admin/ReportsView';
import SettingsView from '@/components/views/admin/SettingsView';
import CompanyListView from '@/components/views/admin/CompanyListView';
import BranchListView from '@/components/views/admin/BranchListView';
import AdminListView from '@/components/views/admin/AdminListView';

// Employee Views
import EmployeeDashboardView from '@/components/views/employee/EmployeeDashboardView';
import MySalaryView from '@/components/views/employee/MySalaryView';
import MyForm16View from '@/components/views/employee/MyForm16View';
import MyProfileView from '@/components/views/employee/MyProfileView';
import ChangePasswordView from '@/components/views/employee/ChangePasswordView';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopbar } from '@/components/layout/app-topbar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { CompanyThemeProvider } from '@/components/layout/company-theme-provider';

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { type: 'spring', stiffness: 300, damping: 30, duration: 0.35 },
};

export default function HomePage() {
  const { isAuthenticated, user, logout, selectedCompany, isAdmin } = useAuthStore();
  const { currentPage } = useNavStore();

  // Public pages (no auth required)
  const publicPages: PageRoute[] = [
    'login', 'register-step-1', 'register-step-2', 'register-step-3',
    'forgot-password', 'appointment-form', 'track-application',
  ];

  const isPublicPage = publicPages.includes(currentPage);

  // If not authenticated and not on a public page, redirect to login
  if (!isAuthenticated && !isPublicPage) {
    return <LoginView />;
  }

  // Public pages
  if (!isAuthenticated) {
    switch (currentPage) {
      case 'login':
        return <LoginView />;
      case 'register-step-1':
      case 'register-step-2':
      case 'register-step-3':
        return <RegisterView />;
      case 'forgot-password':
        return <ForgotPasswordView />;
      case 'appointment-form':
        return <AppointmentFormView />;
      case 'track-application':
        return <TrackApplicationView />;
      default:
        return <LoginView />;
    }
  }

  // Authenticated pages
  const isEmployee = user?.role === 'EMPLOYEE';

  const renderPage = () => {
    if (isEmployee) {
      switch (currentPage) {
        case 'employee-dashboard':
          return <EmployeeDashboardView />;
        case 'my-salary':
          return <MySalaryView />;
        case 'my-form16':
          return <MyForm16View />;
        case 'my-profile':
          return <MyProfileView />;
        case 'change-password':
          return <ChangePasswordView />;
        default:
          return <EmployeeDashboardView />;
      }
    }

    // Admin / Super Admin
    switch (currentPage) {
      case 'admin-dashboard':
        return <DashboardView />;
      case 'employees':
        return <EmployeeListView />;
      case 'employee-add':
      case 'employee-edit':
        return <EmployeeFormView />;
      case 'employee-import':
        return <EmployeeImportView />;
      case 'salary':
        return <SalaryView />;
      case 'salary-upload':
        return <SalaryUploadView />;
      case 'salary-batch-detail':
        return <SalaryBatchDetailView />;
      case 'salary-slips':
        return <SalarySlipsView />;
      case 'form16':
      case 'form16-upload':
        return <Form16View />;
      case 'appointments':
        return <AppointmentListView />;
      case 'appointment-detail':
        return <AppointmentDetailView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      case 'companies':
        return <CompanyListView />;
      case 'branches':
        return <BranchListView />;
      case 'admins':
      case 'admin-add':
        return <AdminListView />;
      default:
        return <DashboardView />;
    }
  };

  // For company admins, show their company accent
  const showAccent = isAdmin();

  return (
    <CompanyThemeProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Company Accent Bar for company admins */}
        {showAccent && !isEmployee && (
          <div className="company-accent-bar" />
        )}

        {/* Desktop/Tablet: Sidebar + Main Content */}
        <div className="flex flex-1">
          {/* Sidebar - hidden on mobile */}
          <AppSidebar />
          
          {/* Main content area */}
          <div className="flex-1 flex flex-col min-h-screen">
            {/* Top bar */}
            <AppTopbar />
            
            {/* Page content with transitions */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  {...pageTransition}
                >
                  {renderPage()}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>

        {/* Bottom Navigation - mobile only */}
        <BottomNav />
      </div>
    </CompanyThemeProvider>
  );
}