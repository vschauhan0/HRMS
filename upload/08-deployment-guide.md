# 08 - Deployment Guide

**Project:** Employee Salary Management Portal\
**Version:** 1.0

------------------------------------------------------------------------

# Purpose

This document defines how the Salary Management Portal should be
deployed across development, staging, and production environments.

The deployment process should be repeatable, secure, and automated
wherever possible.

------------------------------------------------------------------------

# Deployment Architecture

``` text
Users
   │
   ▼
Vercel (React Frontend)
   │
HTTPS
   ▼
Railway / Render (Node.js API)
   │
Prisma ORM
   ▼
Supabase PostgreSQL
   │
Supabase Storage
```

------------------------------------------------------------------------

# Environments

## Development

-   Local React (Vite)
-   Local Express API
-   Supabase Development Database

## Staging

Used for testing before production.

-   Separate environment variables
-   Separate storage bucket (optional)

## Production

Live application.

-   Vercel
-   Railway/Render
-   Supabase Production

------------------------------------------------------------------------

# Required Environment Variables

## Frontend

``` env
VITE_API_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Backend

``` env
PORT=
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Never commit `.env` files.

------------------------------------------------------------------------

# Frontend Deployment

Platform:

-   Vercel

Build Command

``` bash
npm run build
```

Output Directory

``` text
dist
```

------------------------------------------------------------------------

# Backend Deployment

Platform:

-   Railway or
-   Render

Build

``` bash
npm install
```

Start

``` bash
npm run start
```

Health Check

``` text
GET /health
```

------------------------------------------------------------------------

# Database Deployment

Database

-   Supabase PostgreSQL

Use Prisma migrations.

``` bash
npx prisma migrate deploy
```

Never modify production schema manually.

------------------------------------------------------------------------

# File Storage

Store in Supabase Storage:

-   Employee Photos
-   Appointment Documents
-   Salary Slip PDFs
-   Form16 PDFs

Do not store uploaded files on the API server.

------------------------------------------------------------------------

# SSL

All production traffic must use HTTPS.

------------------------------------------------------------------------

# Logging

Enable application logging for:

-   Login
-   Salary Import
-   Appointment Approval
-   Form16 Upload
-   Server Errors

Avoid logging sensitive information.

------------------------------------------------------------------------

# Backup Strategy

Database

-   Daily automated backup (Supabase)

Storage

-   Periodic export if required by business

------------------------------------------------------------------------

# Monitoring

Monitor:

-   API uptime
-   Database health
-   Storage usage
-   Error rates
-   Response times

------------------------------------------------------------------------

# CI/CD (Recommended)

Workflow

``` text
Developer
   ↓
Git Push
   ↓
GitHub
   ↓
Build
   ↓
Tests
   ↓
Deploy
```

Only deploy from the `main` branch.

------------------------------------------------------------------------

# Rollback Strategy

If deployment fails:

1.  Stop rollout.
2.  Restore previous release.
3.  Verify database compatibility.
4.  Investigate logs.
5.  Redeploy after fix.

------------------------------------------------------------------------

# Security Checklist

-   HTTPS enabled
-   Strong JWT secrets
-   Secure environment variables
-   CORS configured
-   Rate limiting enabled
-   File upload validation
-   Database backups verified

------------------------------------------------------------------------

# Production Checklist

Before go-live:

-   Database migrated
-   Environment variables configured
-   Storage bucket created
-   Email service tested
-   Salary import tested
-   Appointment workflow tested
-   Employee registration tested
-   Backups verified
-   Monitoring enabled

------------------------------------------------------------------------

# Maintenance

Regular tasks:

-   Update dependencies
-   Rotate secrets when needed
-   Monitor logs
-   Review backups
-   Apply security patches

------------------------------------------------------------------------

# Conclusion

A successful deployment provides a secure, reliable, and scalable
platform for employees and administrators while ensuring minimal
downtime and a straightforward release process.
