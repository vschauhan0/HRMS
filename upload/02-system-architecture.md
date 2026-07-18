# 02 - System Architecture

**Project:** Employee Salary Management Portal\
**Version:** 1.0

------------------------------------------------------------------------

# Overview

This document defines the technical architecture for the Employee Salary
Management Portal.

The architecture is designed to be:

-   Simple
-   Secure
-   Modular
-   Mobile First
-   Easy for AI Agents to maintain

------------------------------------------------------------------------

# Technology Stack

## Frontend

-   React 19
-   TypeScript
-   Vite
-   Tailwind CSS
-   React Router
-   TanStack Query
-   React Hook Form
-   Zod

## Backend

-   Node.js
-   Express.js
-   TypeScript
-   Prisma ORM

## Database

-   PostgreSQL (Supabase)

## Storage

-   Supabase Storage

## Authentication

-   JWT Access Token
-   Refresh Token
-   OTP Email Verification

------------------------------------------------------------------------

# High Level Architecture

``` text
                React Frontend
                       │
                 REST API (HTTPS)
                       │
            Node.js + Express Server
                       │
        ┌──────────────┴──────────────┐
        │                             │
 Prisma ORM                  Supabase Storage
        │
 PostgreSQL (Supabase)
```

------------------------------------------------------------------------

# Folder Structure

``` text
salary-portal/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── utils/
│   │   └── types/
│   └── public/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── prisma/
│   │   ├── validators/
│   │   ├── utils/
│   │   └── config/
│   └── prisma/
│
└── docs/
```

------------------------------------------------------------------------

# Authentication Flow

## Admin

``` text
Login
 ↓
Validate Credentials
 ↓
Generate JWT
 ↓
Dashboard
```

## Employee First Login

``` text
Employee Code
      ↓
Email Verification
      ↓
OTP
      ↓
Create Password
      ↓
Login
```

------------------------------------------------------------------------

# Authorization

## Super Admin

-   All companies
-   All branches
-   Full access

## Company Admin

-   Assigned company only
-   All branches of assigned company

## Employee

-   Own profile
-   Own salary slips
-   Own Form16

------------------------------------------------------------------------

# Request Flow

``` text
Browser
   ↓
React
   ↓
Axios
   ↓
Express API
   ↓
JWT Middleware
   ↓
Role Middleware
   ↓
Controller
   ↓
Service
   ↓
Prisma
   ↓
PostgreSQL
```

------------------------------------------------------------------------

# File Storage

Store in Supabase Storage:

-   Employee Photo
-   Appointment Documents
-   Salary Slip PDFs
-   Form16 PDFs

Only database stores file paths.

------------------------------------------------------------------------

# Excel Import Flow

``` text
Upload
 ↓
Read Excel
 ↓
Validate
 ↓
Preview
 ↓
Duplicate Check
 ↓
Save
```

Never import directly without preview.

------------------------------------------------------------------------

# Security

-   Password hashing
-   JWT authentication
-   RBAC
-   Company isolation
-   Branch isolation
-   Input validation
-   Rate limiting
-   Audit logging

------------------------------------------------------------------------

# Mobile Architecture

Desktop: - Sidebar - Header - Content

Tablet: - Collapsible sidebar

Phone: - Bottom navigation - Responsive cards - Full-width forms

------------------------------------------------------------------------

# Deployment

Frontend: - Vercel

Backend: - Railway or Render

Database: - Supabase

Storage: - Supabase Storage

------------------------------------------------------------------------

# Development Principles

-   Component-based frontend
-   Service-based backend
-   Repository via Prisma
-   Reusable UI
-   Mobile First
-   Clean architecture
-   No business logic in controllers
-   API-first development

------------------------------------------------------------------------

# Future Ready

Architecture should support:

-   Android app
-   iOS app
-   Additional companies
-   Additional branches
-   Push notifications
-   Background jobs

without major redesign.
