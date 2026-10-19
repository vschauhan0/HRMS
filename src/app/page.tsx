'use client';

import { useEffect } from 'react';
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
import EmployeeDetailView from '@/components/views/admin/EmployeeDetailView';
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
import OrganizationView from '@/components/views/admin/OrganizationView';
import AdminListView from '@/components/views/admin/AdminListView';

// Employee Views
import EmployeeDashboardView from '@/components/views/employee/EmployeeDashboardView';
import MySalaryView from '@/components/views/employee/MySalaryView';
import MyForm16View from '@/components/views/employee/MyForm16View';
import MyProfileView from '@/components/views/employee/MyProfileView';
import ChangePasswordView from '@/components/views/employee/ChangePasswordView';
import MyAttendanceView from '@/components/views/employee/MyAttendanceView';
import MyLeavesView from '@/components/views/employee/MyLeavesView';

// New Admin Views
import AttendanceView from '@/components/views/admin/AttendanceView';
import AttendanceDetailView from '@/components/views/admin/AttendanceDetailView';
import LeaveListView from '@/components/views/admin/LeaveListView';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopbar } from '@/components/layout/app-topbar';
import { BottomNav } from '@/components/layout/bottom-nav';

const pageTransition: any = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { type: 'spring', stiffness: 300, damping: 30, duration: 0.35 },
};

export default function HomePage() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { currentPage, navigate } = useNavStore();

  const isEmployee = user?.role === 'EMPLOYEE';

  const isProfileComplete = user?.employee ? (
    user.employee.email &&
    user.employee.mobile &&
    user.employee.pan &&
    user.employee.gender &&
    user.employee.city &&
    user.employee.pin &&
    user.employee.district &&
    user.employee.state &&
    user.employee.aadharNumber &&
    user.employee.dob &&
    user.employee.joiningDate &&
    user.employee.department &&
    user.employee.designation &&
    user.employee.address &&
    user.employee.bankDetail?.bankName &&
    user.employee.bankDetail?.accountNumber &&
    user.employee.bankDetail?.ifsc &&
    user.employee.bankDetail?.accountHolder
  ) : false;

  useEffect(() => {
    if (isEmployee && !isProfileComplete && currentPage !== 'my-profile') {
      navigate('my-profile');
    }
  }, [isEmployee, isProfileComplete, currentPage, navigate]);

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
        case 'my-attendance':
          return <MyAttendanceView />;
        case 'my-leaves':
          return <MyLeavesView />;
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
      case 'employee-detail':
        return <EmployeeDetailView />;
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
      case 'attendance':
        return <AttendanceView />;
      case 'attendance-details':
        return <AttendanceDetailView />;
      case 'leaves':
        return <LeaveListView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      case 'my-profile':
        return <MyProfileView />;
      case 'change-password':
        return <ChangePasswordView />;
      case 'companies':
        return <OrganizationView />;
      case 'admins':
      case 'admin-add':
        return <AdminListView />;
      case 'attendance':
        return <AttendanceView />;
      case 'leaves':
      case 'leave-detail':
        return <LeaveListView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Desktop/Tablet: Sidebar + Main Content */}
      <div className="flex flex-1">
        {/* Sidebar - hidden on mobile */}
        <AppSidebar />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
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
  );
}