# Project Context: HRMS (Human Resources Management System)

This document provides a comprehensive overview of the HRMS project. It is designed to be provided as context to an AI model to quickly understand the project's architecture, technologies, database structure, and current state.

## 1. Project Overview
- **Name:** HRMS (Internal Code: `nextjs_tailwind_shadcn_ts`)
- **Version:** 0.2.0
- **Type:** Full-stack Web Application
- **Architecture:** Next.js App Router with Server Components and Server Actions.
- **Current State:** Active development (Dev server currently running via Turbo).

## 2. Technology Stack
- **Framework:** Next.js (v16.1.1)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (v4), PostCSS
- **UI Components:** Shadcn UI (Radix UI primitives)
- **Database ORM:** Prisma (v6.11.1)
- **Database Engine:** PostgreSQL
- **Authentication:** NextAuth (v4.24.11)
- **State Management:** Zustand (v5.0.6)
- **Form Handling:** React Hook Form + Zod (Validation)
- **Data Fetching:** TanStack React Query (v5)
- **Tables:** TanStack React Table (v8)
- **Charts:** Recharts
- **Icons:** Lucide React

## 3. Database Schema (Prisma)
The application uses a PostgreSQL database structured around multi-tenant companies, branches, employees, and their lifecycle.

### Key Models:
- **Organization Structure:**
  - `Company`: Root entity representing the company.
  - `Branch`: Associated with a company.
- **Users & Authentication:**
  - `User`: Handles authentication, roles (`SUPER_ADMIN`, `ADMIN`, `EMPLOYEE`), and relations to Employee or Admin profiles.
  - `AdminProfile`: Profile data for administrative users.
- **Employee Management:**
  - `Employee`: Core employee record (personal info, job details, status).
  - `EmployeeBankDetail`: Bank information for salary processing.
  - `AppointmentForm`: Extensive candidate application and onboarding details.
- **Payroll & Documents:**
  - `SalaryBatch`: Groups monthly salary processing.
  - `SalarySlip`: Individual monthly salary breakdown (Earnings, Deductions, Leaves).
  - `Form16Document`: Tax documents linked to employees.
- **Attendance & Leaves:**
  - `Attendance`: Daily check-in/out records.
  - `LeaveRequest`: Leave applications and approval workflow.
- **System & Utility:**
  - `AuditLog`: Tracks user actions across modules.
  - `OtpStore`: Manages OTPs for registration/password resets.
  - `Notification`: In-app user notifications.
  - `Settings`: Global system configuration key-value pairs.

## 4. Project Structure
The source code follows standard Next.js App Router conventions:

```text
d:\HRMS\
├── prisma/             # Database schema (schema.prisma) and migrations
├── public/             # Static assets (images, etc.)
├── src/
│   ├── app/            # Next.js App Router (Pages, Layouts, API Routes)
│   ├── components/     # Reusable UI components (Shadcn components here)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions and configurations
│   ├── store/          # Zustand state management slices
│   └── types/          # TypeScript interface and type definitions
├── package.json        # Dependencies and scripts
└── tailwind.config.ts  # Tailwind CSS configuration
```

## 5. Available Scripts (package.json)
- `npm run dev`: Starts the Next.js development server with Turbopack on `0.0.0.0:3000`.
- `npm run build`: Builds the application for production (standalone mode).
- `npm run start`: Runs the production server using Bun.
- `npm run lint`: Runs ESLint for code formatting.
- `npm run db:push`: Pushes Prisma schema state to the database without migrations.
- `npm run db:generate`: Generates the Prisma client.
- `npm run db:migrate`: Creates and applies database migrations.
- `npm run db:seed`: Seeds the database using `prisma/seed.ts`.

## 6. Notable Integrations & Features
- **PDF Generation:** Utilizes `pdfkit` for generating dynamic documents like Salary Slips.
- **Drag and Drop:** Uses `@dnd-kit` for interactive UI elements.
- **Markdown Editing:** Includes `@mdxeditor/editor` and `react-markdown`.
- **Image Processing:** Uses `sharp` for image optimization.
- **Excel/Data Export:** Includes `xlsx` for spreadsheet parsing and exporting.

## Recommended Instructions for AI Models
When assisting with this project, the model should:
1. Always use **TypeScript** and strongly type inputs/outputs.
2. Utilize **Tailwind CSS** for styling new components.
3. Use **Shadcn UI** conventions for new interface elements.
4. Prefer **Server Actions** over standard API routes for Next.js data mutations, given the App Router architecture.
5. Use **Prisma Client** for all database interactions.
