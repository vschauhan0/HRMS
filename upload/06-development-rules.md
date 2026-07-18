# 06 - Development Rules

**Project:** Employee Salary Management Portal\
**Audience:** AI Coding Agents & Developers\
**Version:** 1.0

------------------------------------------------------------------------

# Purpose

This document defines the development workflow, coding process, Git
strategy, implementation order, and project rules.

Every contributor and AI agent must follow these rules to ensure
consistent, maintainable, and production-ready code.

------------------------------------------------------------------------

# Core Principles

-   Build only approved features.
-   Do not introduce HRMS functionality.
-   Keep code modular and reusable.
-   Prefer clarity over cleverness.
-   Write production-ready code only.

------------------------------------------------------------------------

# Project Scope Rules

Allowed modules:

-   Authentication
-   Employee Management
-   Salary Management
-   Appointment Forms
-   Form16
-   Reports
-   Settings

Do NOT add:

-   Attendance
-   Leave
-   Payroll calculation
-   Inventory
-   Asset Management
-   AI Chatbot
-   CRM

------------------------------------------------------------------------

# Development Phases

## Phase 1

-   Project setup
-   Folder structure
-   Database
-   Authentication
-   UI theme

## Phase 2

-   Employee CRUD
-   Employee Import
-   Search
-   Pagination

## Phase 3

-   Salary Upload
-   Salary Slips
-   Excel Validation

## Phase 4

-   Appointment Forms
-   Registration Flow
-   OTP Verification

## Phase 5

-   Employee Dashboard
-   Form16
-   Reports

## Phase 6

-   Testing
-   Optimization
-   Deployment

------------------------------------------------------------------------

# Git Workflow

Main Branches

-   main
-   develop

Feature branches

feature/`<module-name>`{=html}

Examples

feature/employee-import

feature/salary-upload

feature/auth

------------------------------------------------------------------------

# Commit Message Format

Examples

feat: add employee import

fix: resolve OTP validation

refactor: simplify salary service

docs: update API specification

------------------------------------------------------------------------

# Pull Request Checklist

Before merging:

-   Code compiles
-   Tests pass
-   Lint passes
-   No console logs
-   No unused imports
-   Documentation updated

------------------------------------------------------------------------

# Backend Rules

-   Controllers remain thin.
-   Business logic belongs in services.
-   Prisma handles database access.
-   Validate all requests.
-   Never expose database errors.

------------------------------------------------------------------------

# Frontend Rules

-   Components should be reusable.
-   Avoid duplicated code.
-   Use React Query for API calls.
-   Use React Hook Form for forms.
-   Validate with Zod.
-   Handle loading and error states.

------------------------------------------------------------------------

# API Rules

-   Use REST conventions.
-   Return consistent JSON.
-   Use HTTP status codes correctly.
-   Secure every endpoint.

------------------------------------------------------------------------

# Database Rules

-   Never hard delete employees.
-   Use status fields.
-   Use UUID primary keys.
-   Create indexes for search fields.
-   Use migrations for schema changes.

------------------------------------------------------------------------

# Excel Import Rules

Workflow:

Upload ↓ Preview ↓ Validate ↓ Duplicate Check ↓ Confirm ↓ Import

Do not import invalid rows.

------------------------------------------------------------------------

# Error Handling

Every API must return:

``` json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

Never expose stack traces to users.

------------------------------------------------------------------------

# Security Rules

-   Hash passwords.
-   Validate JWT.
-   Check company access.
-   Check branch access.
-   Sanitize input.
-   Rate limit authentication endpoints.

------------------------------------------------------------------------

# Logging

Log only important events:

-   Employee created
-   Employee updated
-   Salary imported
-   Form16 uploaded
-   Appointment approved
-   Login

------------------------------------------------------------------------

# Testing Rules

Test:

-   Authentication
-   Employee CRUD
-   Salary Import
-   Appointment Flow
-   Profile Update

Use unit and integration tests where practical.

------------------------------------------------------------------------

# Performance Rules

-   Paginate large tables.
-   Lazy load pages.
-   Optimize images.
-   Avoid unnecessary re-renders.
-   Batch database writes during imports.

------------------------------------------------------------------------

# Documentation Rules

Whenever a feature changes:

-   Update API documentation.
-   Update database schema.
-   Update UI guide if affected.

Documentation is part of the feature.

------------------------------------------------------------------------

# AI Agent Rules

Before writing code:

1.  Read project overview.
2.  Read architecture.
3.  Read database schema.
4.  Read API specification.

Do not invent new tables or endpoints without updating documentation.

Implement one module at a time.

Never skip validation, authorization, or error handling.

------------------------------------------------------------------------

# Definition of Done

A feature is complete only when:

-   Requirements implemented
-   Responsive UI
-   Validation added
-   Authorization enforced
-   Error handling implemented
-   Documentation updated
-   Code reviewed
