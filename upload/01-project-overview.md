# Employee Salary Management Portal

**Version:** 1.0\
**Document:** 01 - Project Overview\
**Project Type:** Internal Enterprise Web Application\
**Status:** Planning Phase

------------------------------------------------------------------------

# Project Overview

## Introduction

The Employee Salary Management Portal is a secure, web-based application
designed to simplify employee salary management for multiple companies
under one platform.

The system focuses only on salary-related operations and employee
self-service. It is **not** an HRMS.

It allows administrators to manage employees, upload salary data through
Excel, publish salary slips, upload Form-16 documents, and manage
appointment forms.

Employees can securely access their own salary information, download
salary slips and Form-16 documents, update limited profile information,
and register after receiving an employee code.

------------------------------------------------------------------------

# Project Objectives

-   Modernize the existing salary portal.
-   Simplify employee management.
-   Provide secure employee registration.
-   Support validated Excel imports.
-   Deliver responsive UI for desktop, tablet, and mobile.
-   Prepare for future Android and iOS apps.

------------------------------------------------------------------------

# Business Structure

## Companies

### Nidhi Impex

-   Shreeji
-   Ichhapore

### Silver Star

-   Daduk
-   Ichhapore

Every employee belongs to exactly one company and one branch.

------------------------------------------------------------------------

# User Roles

## Super Admin

-   Access all companies
-   Create company admins
-   Manage employees
-   Import employee and salary Excel
-   Upload Form16
-   Approve appointment forms
-   View reports

## Company Admin

-   Access only assigned company
-   Manage employees
-   Import employees
-   Upload salaries
-   Upload Form16
-   Approve appointment forms

## Employee

-   View/download salary slips
-   Download Form16
-   Edit profile
-   Change password

------------------------------------------------------------------------

# Core Modules

1.  Authentication
2.  Employee Management
3.  Salary Management
4.  Appointment Forms
5.  Employee Portal
6.  Reports

------------------------------------------------------------------------

# Employee Registration Workflow

``` text
Admin Adds Employee
        ↓
Employee Code Generated
        ↓
Employee Opens Portal
        ↓
Employee Code + Email
        ↓
OTP Verification
        ↓
Create Password
        ↓
Login
```

------------------------------------------------------------------------

# Salary Upload Workflow

``` text
Select Company
      ↓
Select Branch
      ↓
Select Month
      ↓
Upload Excel
      ↓
Preview
      ↓
Validate
      ↓
Import
      ↓
Salary Slips Generated
```

------------------------------------------------------------------------

# Non-Functional Requirements

-   Mobile First
-   Secure JWT Authentication
-   PostgreSQL (Supabase)
-   Prisma ORM
-   Fast Excel Import
-   Role-Based Access Control
-   Company Isolation
-   Responsive Design

------------------------------------------------------------------------

# Technology Stack

## Frontend

-   React 19
-   TypeScript
-   Vite
-   Tailwind CSS

## Backend

-   Node.js
-   Express.js
-   TypeScript

## Database

-   PostgreSQL (Supabase)

## ORM

-   Prisma

## Storage

-   Supabase Storage

------------------------------------------------------------------------

# Future Scope

-   Android App
-   iOS App
-   Push Notifications
-   Announcement Module
-   Multi-language Support

------------------------------------------------------------------------

# Conclusion

This project replaces the legacy salary portal with a focused, secure,
and maintainable application dedicated to employee salary management
without expanding into a full HRMS.
