# 07 - Coding Standards

**Project:** Employee Salary Management Portal\
**Language:** TypeScript\
**Frontend:** React 19 + Vite\
**Backend:** Node.js + Express + Prisma

------------------------------------------------------------------------

# Purpose

These standards ensure all developers and AI agents write clean,
consistent, secure, and maintainable code.

------------------------------------------------------------------------

# General Principles

-   Write readable code.
-   Prefer simplicity over cleverness.
-   Follow SOLID principles where appropriate.
-   Keep functions small and focused.
-   Avoid duplicate code (DRY).
-   Use TypeScript strict mode.

------------------------------------------------------------------------

# Naming Conventions

## Files

-   kebab-case

Examples

-   employee-service.ts
-   salary-upload.tsx
-   auth-controller.ts

## Components

PascalCase

-   EmployeeTable.tsx
-   SalaryCard.tsx

## Variables

camelCase

``` ts
const employeeCode = "";
```

## Constants

UPPER_SNAKE_CASE

``` ts
const MAX_UPLOAD_SIZE = 10;
```

## Interfaces & Types

PascalCase

``` ts
interface Employee {}
type SalarySlip = {}
```

------------------------------------------------------------------------

# Folder Structure

## Frontend

``` text
src/
├── components/
├── pages/
├── layouts/
├── hooks/
├── services/
├── store/
├── utils/
├── types/
```

## Backend

``` text
src/
├── controllers/
├── services/
├── routes/
├── middleware/
├── validators/
├── prisma/
├── config/
├── utils/
```

------------------------------------------------------------------------

# React Standards

-   Functional components only.
-   One component per file.
-   Use hooks instead of class components.
-   Keep pages thin; move logic to hooks/services.
-   Use React Query for server state.
-   Use React Hook Form for forms.
-   Validate with Zod.

------------------------------------------------------------------------

# Express Standards

-   Thin controllers.
-   Business logic in services.
-   Separate routes from controllers.
-   Use async/await.
-   Centralized error handler.
-   No direct SQL; use Prisma.

------------------------------------------------------------------------

# Prisma Standards

-   UUID primary keys.
-   Use migrations.
-   Avoid raw SQL unless necessary.
-   Select only required fields.
-   Wrap multi-step writes in transactions.

------------------------------------------------------------------------

# API Standards

-   RESTful naming.
-   Consistent response shape.
-   Meaningful HTTP status codes.
-   Validate all input.
-   Never expose stack traces.

Success

``` json
{
  "success": true,
  "data": {}
}
```

Error

``` json
{
  "success": false,
  "message": "Validation failed"
}
```

------------------------------------------------------------------------

# Error Handling

-   Catch errors at service/controller boundary.
-   Log server errors.
-   Show user-friendly messages.
-   Do not leak internal details.

------------------------------------------------------------------------

# Security Standards

-   Hash passwords (bcrypt/argon2).
-   Verify JWT on protected routes.
-   Role-based authorization.
-   Company and branch access checks.
-   Input sanitization.
-   Rate limit auth endpoints.

------------------------------------------------------------------------

# Performance Guidelines

-   Paginate large datasets.
-   Lazy-load routes.
-   Optimize images.
-   Memoize expensive computations where needed.
-   Batch inserts during Excel imports.

------------------------------------------------------------------------

# Styling Standards

-   Tailwind CSS only.
-   Reusable UI components.
-   Consistent spacing (8px grid).
-   Mobile-first responsive design.
-   Dark mode support.

------------------------------------------------------------------------

# Testing

Minimum coverage for:

-   Authentication
-   Employee CRUD
-   Salary import
-   Appointment workflow
-   Profile updates

------------------------------------------------------------------------

# Logging

Log important events only:

-   Login
-   Employee created
-   Employee updated
-   Salary imported
-   Appointment approved
-   Form16 uploaded

------------------------------------------------------------------------

# Code Review Checklist

-   Correct naming
-   No duplicate logic
-   Validation added
-   Authorization enforced
-   Error handling complete
-   Responsive UI
-   Documentation updated

------------------------------------------------------------------------

# AI Agent Rules

Before coding:

1.  Read project overview.
2.  Read architecture.
3.  Read database schema.
4.  Read API specification.
5.  Follow development rules.

Do not invent features outside project scope.

Always reuse existing components and services before creating new ones.

------------------------------------------------------------------------

# Definition of Quality

Good code should be:

-   Readable
-   Reusable
-   Testable
-   Secure
-   Performant
-   Well documented
-   Easy to maintain

These standards apply to every commit and every feature.
