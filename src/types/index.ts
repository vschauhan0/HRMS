// Roles
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE';

// Employee Status
export type EmployeeStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'RESIGNED';

// Application Status
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Company
export interface Company {
  id: string;
  name: string;
  code: string;
  themeColor: string;
  address: string | null;
  pan: string | null;
  tan: string | null;
  status: boolean;
  createdAt: string;
  updatedAt: string;
}

// Branch
export interface Branch {
  id: string;
  companyId: string;
  name: string;
  code: string;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  company?: Company;
}

// Admin Profile
export interface AdminProfile {
  id: string;
  userId: string;
  companyId: string;
  name: string;
  mobile: string | null;
  createdAt: string;
  updatedAt: string;
  company?: Company;
}

// Employee
export interface Employee {
  id: string;
  companyId: string;
  branchId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  pan: string | null;
  gender: string | null;
  city: string | null;
  pin: string | null;
  district: string | null;
  state: string | null;
  pfNo: string | null;
  esiNo: string | null;
  aadharNumber: string | null;
  uan: string | null;
  dob: string | null;
  joiningDate: string;
  resignationDate: string | null;
  department: string | null;
  designation: string | null;
  status: EmployeeStatus;
  profilePhoto: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  branch?: Branch;
  bankDetail?: EmployeeBankDetail;
}

// Employee Bank Detail
export interface EmployeeBankDetail {
  id: string;
  employeeId: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  accountHolder: string;
  createdAt: string;
  updatedAt: string;
}

// Appointment Form
export interface FamilyMember {
  name: string;
  relation: string;
  dob: string;
  mobile: string;
  occupation: string;
}

export interface AppointmentForm {
  id: string;
  applicationNo: string;
  fullName: string | null;
  email: string | null;
  mobile: string | null;
  companyId: string;
  branchId: string;
  status: ApplicationStatus;
  documentPath: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  branch?: Branch;
  // Expanded fields
  employeeCode?: string | null;
  joiningDate?: string | null;
  department?: string | null;
  designation?: string | null;
  managerName?: string | null;
  salary?: number | null;
  whatsappNo?: string | null;
  punchingNo?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  surname?: string | null;
  address?: string | null;
  village?: string | null;
  taluka?: string | null;
  district?: string | null;
  dob?: string | null;
  birthPlace?: string | null;
  gender?: string | null;
  cast?: string | null;
  maritalStatus?: string | null;
  bloodGroup?: string | null;
  referenceName?: string | null;
  referenceMobile?: string | null;
  aadharNumber?: string | null;
  panNumber?: string | null;
  bankName?: string | null;
  bankIfsc?: string | null;
  bankAccountNo?: string | null;
  education?: string | null;
  familyMembers?: string | null;
  photoPath?: string | null;
  signaturePath?: string | null;
}

// Salary Batch
export interface SalaryBatch {
  id: string;
  companyId: string;
  branchId: string;
  month: number;
  year: number;
  uploadedBy: string;
  fileName: string;
  importedRecords: number;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  branch?: Branch;
}

// Salary Slip
export interface SalarySlip {
  id: string;
  batchId: string;
  employeeId: string;
  month: number;
  year: number;
  grossSalary: number;
  totalDeduction: number;
  netSalary: number;
  salary: number | null;
  basicSalary: number | null;
  hra: number | null;
  da: number | null;
  conveyance: number | null;
  medical: number | null;
  specialAllow: number | null;
  otherEarning: number | null;
  pf: number | null;
  esi: number | null;
  tds: number | null;
  professionalTax: number | null;
  lwf: number | null;
  advance: number | null;
  otherDeduction: number | null;
  workingDays: number | null;
  presentDays: number | null;
  leave: number | null;
  lwp: number | null;
  pdfPath: string | null;
  createdAt: string;
  updatedAt: string;
  batch?: SalaryBatch;
  employee?: Employee;
}

// Form16 Document
export interface Form16Document {
  id: string;
  employeeId: string;
  financialYear: string;
  filePath: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  employee?: { id: string; employeeCode: string; firstName: string; lastName: string; email: string; company?: { name: string } };
}

// Audit Log
export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  module: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

// User (for auth)
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  employeeId: string | null;
  adminProfile?: AdminProfile & { company: Company };
  employee?: Employee;
}

// Navigation pages for the SPA
export type PageRoute =
  // Public
  | 'login'
  | 'register-step-1'
  | 'register-step-2'
  | 'register-step-3'
  | 'forgot-password'
  | 'appointment-form'
  | 'track-application'
  // Admin
  | 'admin-dashboard'
  | 'employees'
  | 'employee-add'
  | 'employee-edit'
  | 'employee-import'
  | 'salary'
  | 'salary-upload'
  | 'salary-batch-detail'
  | 'salary-slips'
  | 'form16'
  | 'form16-upload'
  | 'appointments'
  | 'appointment-detail'
  | 'reports'
  | 'settings'
  // Super Admin
  | 'companies'
  | 'branches'
  | 'admins'
  | 'admin-add'
  // Employee
  | 'employee-dashboard'
  | 'my-salary'
  | 'my-form16'
  | 'my-profile'
  | 'change-password';

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// API Response
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

// Import Result
export interface ImportResult {
  newRecords: number;
  updatedRecords: number;
  invalidRecords: number;
  errors: { row: number; message: string }[];
}

// Dashboard Stats
export interface DashboardStats {
  totalEmployees: number;
  pendingRegistrations: number;
  activeEmployees: number;
  resignedEmployees: number;
  inactiveEmployees?: number;
  salaryBatches: number;
  pendingAppointments: number;
  totalForm16: number;
}

// Salary Import Row (from Excel)
export interface SalaryImportRow {
  employeeCode: string;
  employeeName?: string;
  grossSalary: number;
  totalDeduction: number;
  netSalary: number;
  salary?: number;
  basicSalary?: number;
  hra?: number;
  da?: number;
  conveyance?: number;
  medical?: number;
  specialAllow?: number;
  otherEarning?: number;
  pf?: number;
  esi?: number;
  tds?: number;
  professionalTax?: number;
  lwf?: number;
  advance?: number;
  otherDeduction?: number;
  workingDays?: number;
  presentDays?: number;
  leave?: number;
}

// Employee Import Row
export interface EmployeeImportRow {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  pan?: string;
  gender?: string;
  city?: string;
  pin?: string;
  district?: string;
  state?: string;
  pfNo?: string;
  esiNo?: string;
  aadharNumber?: string;
  dob?: string;
  joiningDate: string;
  resignationDate?: string;
  department?: string;
  designation?: string;
  branchCode: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
}