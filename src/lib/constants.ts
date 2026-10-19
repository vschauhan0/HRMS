export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export const EMPLOYEE_STATUSES = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  RESIGNED: 'RESIGNED',
} as const;

export const APPLICATION_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  RESIGNED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PRESENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  ABSENT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  HALF_DAY: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  LATE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  HOLIDAY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  WEEK_OFF: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'HOLIDAY', 'WEEK_OFF'] as const;

export const LEAVE_TYPES = ['Paid Leave (PL)', 'Casual Leave (CL)', 'Sick Leave (SL)', 'Maternity Leave', 'Paternity Leave', 'Other'] as const;

export const PAGE_SIZE = 20;