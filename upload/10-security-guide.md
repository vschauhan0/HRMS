# 10 - Security Guide

**Project:** Employee Salary Management Portal\
**Version:** 1.0

------------------------------------------------------------------------

# Purpose

This document defines the security architecture, authentication,
authorization, data protection, and operational security requirements
for the Employee Salary Management Portal.

------------------------------------------------------------------------

# Security Objectives

-   Protect employee salary and personal data
-   Prevent unauthorized access
-   Ensure company and branch data isolation
-   Maintain auditability
-   Comply with secure coding best practices

------------------------------------------------------------------------

# Authentication

## Login

-   Email + Password
-   Employee first-time registration requires Employee Code + Email +
    OTP
-   Passwords must never be stored in plain text

Recommended hashing:

-   Argon2id (preferred)
-   bcrypt (minimum 12 rounds)

------------------------------------------------------------------------

# Password Policy

-   Minimum 8 characters
-   At least one uppercase letter
-   At least one lowercase letter
-   At least one number
-   At least one special character

Passwords should expire only if required by company policy.

------------------------------------------------------------------------

# JWT Security

Use:

-   Access Token (short-lived, e.g. 15 minutes)
-   Refresh Token (e.g. 7 days)

Requirements:

-   Signed with strong secrets
-   HTTPS only
-   Refresh token rotation
-   Immediate revocation on logout

------------------------------------------------------------------------

# Role-Based Access Control (RBAC)

Roles:

-   Super Admin
-   Company Admin
-   Employee

Authorization rules:

-   Employees can access only their own records.
-   Company Admins can access only their assigned company.
-   Super Admins can access all companies and branches.

Every protected endpoint must verify both authentication and
authorization.

------------------------------------------------------------------------

# Company & Branch Isolation

Every query must enforce:

-   Company ID
-   Branch ID (where applicable)

Never rely solely on client-provided identifiers.

------------------------------------------------------------------------

# Database Security

-   Use Prisma ORM
-   Parameterized queries only
-   UUID primary keys
-   Database credentials stored in environment variables
-   Least-privilege database access

------------------------------------------------------------------------

# Row Level Security (Optional)

If using Supabase RLS:

-   Restrict employee records to owner
-   Restrict company data by company_id
-   Restrict storage access to authorized users

------------------------------------------------------------------------

# File Upload Security

Allowed uploads:

-   Employee photo
-   Appointment documents
-   Salary slip PDFs
-   Form16 PDFs

Validation:

-   MIME type
-   File extension
-   File size
-   Virus scanning (recommended for production)

Store files in Supabase Storage; never execute uploaded files.

------------------------------------------------------------------------

# OTP Security

-   OTP length: 6 digits
-   Expiry: 10 minutes
-   Maximum retry attempts
-   Invalidate after successful verification

------------------------------------------------------------------------

# Rate Limiting

Protect endpoints:

-   Login
-   OTP requests
-   Password reset

Example:

-   5 login attempts per 15 minutes per IP/user

------------------------------------------------------------------------

# Session Management

-   Logout invalidates refresh token
-   Idle session timeout (configurable)
-   Force re-login after password change

------------------------------------------------------------------------

# Input Validation

Validate all input using Zod (frontend and backend).

Check:

-   Required fields
-   Email format
-   Mobile format
-   File uploads
-   Numeric ranges
-   String lengths

Sanitize user input before persistence.

------------------------------------------------------------------------

# Security Headers

Enable:

-   HTTPS
-   HSTS
-   X-Content-Type-Options
-   X-Frame-Options
-   Referrer-Policy
-   Content-Security-Policy

------------------------------------------------------------------------

# CORS

Allow only trusted frontend origins.

Do not use wildcard origins in production.

------------------------------------------------------------------------

# Logging & Audit

Audit events:

-   Login success/failure
-   Password change
-   Employee create/update/status change
-   Salary import
-   Form16 upload
-   Appointment approval/rejection

Do not log passwords, OTPs, or JWTs.

------------------------------------------------------------------------

# Backup & Recovery

-   Automated daily database backups
-   Periodic storage verification
-   Restore procedure tested regularly

------------------------------------------------------------------------

# Incident Response

If a breach is suspected:

1.  Isolate affected systems.
2.  Revoke active sessions.
3.  Rotate secrets.
4.  Review audit logs.
5.  Restore from backups if required.
6.  Notify stakeholders according to company policy.

------------------------------------------------------------------------

# Dependency Management

-   Keep dependencies updated
-   Monitor known vulnerabilities
-   Remove unused packages
-   Lock dependency versions where appropriate

------------------------------------------------------------------------

# Security Testing

Perform:

-   Authentication tests
-   Authorization tests
-   File upload tests
-   SQL Injection checks
-   XSS checks
-   CSRF review (if cookie-based auth)
-   Rate limit verification

------------------------------------------------------------------------

# Production Security Checklist

-   HTTPS enforced
-   Environment variables secured
-   Strong JWT secrets
-   Database backups enabled
-   Logging configured
-   Monitoring enabled
-   File upload validation active
-   CORS restricted
-   Rate limiting enabled
-   Password hashing verified

------------------------------------------------------------------------

# Conclusion

Security is a shared responsibility across development, deployment, and
operations. Every feature must be designed with authentication,
authorization, validation, and auditability in mind to protect sensitive
employee and payroll information.
