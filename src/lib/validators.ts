import { z } from 'zod/v4';

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const requestRegistrationSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required'),
  email: z.email('Invalid email address'),
});

export const verifyOtpSchema = z.object({
  email: z.email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const createPasswordSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const employeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.email('Invalid email address'),
  mobile: z.string().min(10, 'Invalid mobile number').max(15, 'Invalid mobile number'),
  pan: z.string().optional(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  department: z.string().optional(),
  designation: z.string().optional(),
  branchId: z.string().min(1, 'Branch is required'),
  address: z.string().optional(),
});

export const appointmentFormSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.email('Invalid email address'),
  mobile: z.string().min(10, 'Invalid mobile number').max(15, 'Invalid mobile number'),
  companyId: z.string().min(1, 'Company is required'),
  branchId: z.string().min(1, 'Branch is required'),
});

export const trackApplicationSchema = z.object({
  applicationNo: z.string().min(1, 'Application number is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address'),
});

export const profileSchema = z.object({
  email: z.email('Invalid email address'),
  mobile: z.string().min(10, 'Invalid mobile number').max(15, 'Invalid mobile number'),
  address: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RequestRegistrationInput = z.infer<typeof requestRegistrationSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreatePasswordInput = z.infer<typeof createPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type AppointmentFormInput = z.infer<typeof appointmentFormSchema>;
export type TrackApplicationInput = z.infer<typeof trackApplicationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;