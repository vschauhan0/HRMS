# 03 - Database Schema

**Project:** Employee Salary Management Portal\
**Database:** PostgreSQL (Supabase)\
**ORM:** Prisma

------------------------------------------------------------------------

# Overview

This document defines the normalized database schema for the Salary
Management Portal.

Goals:

-   Simple
-   Scalable
-   Secure
-   Multi-company support
-   Easy Excel import

------------------------------------------------------------------------

# Database Design

``` text
Company
   │
Branch
   │
Employee
   ├── Salary Slips
   ├── Form16
   └── Appointment Form
```

------------------------------------------------------------------------

# Tables

## companies

  Column       Type        Description
  ------------ ----------- -----------------
  id           UUID        Primary Key
  name         VARCHAR     Company Name
  code         VARCHAR     Unique Code
  status       BOOLEAN     Active/Inactive
  created_at   TIMESTAMP   Created Date

------------------------------------------------------------------------

## branches

  Column       Type
  ------------ ---------
  id           UUID
  company_id   UUID FK
  name         VARCHAR
  code         VARCHAR
  status       BOOLEAN

------------------------------------------------------------------------

## users

Authentication table.

  Column        Type
  ------------- ----------------------------------
  id            UUID
  email         VARCHAR UNIQUE
  password      TEXT
  role          ENUM(super_admin,admin,employee)
  employee_id   UUID NULL
  created_at    TIMESTAMP

------------------------------------------------------------------------

## employees

  Column          Type
  --------------- ----------------------------------------
  id              UUID
  company_id      UUID
  branch_id       UUID
  employee_code   VARCHAR UNIQUE
  first_name      VARCHAR
  last_name       VARCHAR
  email           VARCHAR
  mobile          VARCHAR
  joining_date    DATE
  department      VARCHAR
  designation     VARCHAR
  status          ENUM(PENDING,ACTIVE,INACTIVE,RESIGNED)
  profile_photo   TEXT

Business rule: - Employee is never deleted. - Status changes instead.

------------------------------------------------------------------------

## employee_bank_details

  Column           Type
  ---------------- ---------
  id               UUID
  employee_id      UUID
  bank_name        VARCHAR
  account_number   VARCHAR
  ifsc             VARCHAR
  account_holder   VARCHAR

------------------------------------------------------------------------

## appointment_forms

  Column           Type
  ---------------- ---------------------------------
  id               UUID
  application_no   VARCHAR UNIQUE
  full_name        VARCHAR
  email            VARCHAR
  mobile           VARCHAR
  company_id       UUID
  branch_id        UUID
  status           ENUM(PENDING,APPROVED,REJECTED)
  document_path    TEXT
  submitted_at     TIMESTAMP

------------------------------------------------------------------------

## salary_batches

Stores each uploaded Excel.

  Column             Type
  ------------------ -----------
  id                 UUID
  company_id         UUID
  branch_id          UUID
  month              INT
  year               INT
  uploaded_by        UUID
  file_name          VARCHAR
  imported_records   INT
  created_at         TIMESTAMP

------------------------------------------------------------------------

## salary_slips

  Column            Type
  ----------------- -----------
  id                UUID
  batch_id          UUID
  employee_id       UUID
  month             INT
  year              INT
  gross_salary      DECIMAL
  total_deduction   DECIMAL
  net_salary        DECIMAL
  pdf_path          TEXT
  created_at        TIMESTAMP

Unique Constraint:

(employee_id, month, year)

------------------------------------------------------------------------

## form16_documents

  Column           Type
  ---------------- ---------
  id               UUID
  employee_id      UUID
  financial_year   VARCHAR
  file_path        TEXT
  uploaded_by      UUID

------------------------------------------------------------------------

## audit_logs

  Column       Type
  ------------ -----------
  id           UUID
  user_id      UUID
  action       VARCHAR
  module       VARCHAR
  created_at   TIMESTAMP

------------------------------------------------------------------------

# Relationships

``` text
Company
 └── Branch
      ├── Employee
      │      ├── Bank Details
      │      ├── Salary Slips
      │      └── Form16
      └── Appointment Forms

Users
 └── Employee (optional)

Salary Batch
 └── Salary Slips
```

------------------------------------------------------------------------

# Indexes

-   employee_code
-   email
-   company_id
-   branch_id
-   month
-   year
-   application_no

Composite Indexes

-   (employee_id, month, year)
-   (company_id, branch_id)

------------------------------------------------------------------------

# Prisma Model Naming

-   Company
-   Branch
-   User
-   Employee
-   EmployeeBankDetail
-   AppointmentForm
-   SalaryBatch
-   SalarySlip
-   Form16Document
-   AuditLog

------------------------------------------------------------------------

# Import Strategy

Employee Import

1.  Read Excel
2.  Validate
3.  Match employee_code
4.  Update existing
5.  Insert new

Salary Import

1.  Create SalaryBatch
2.  Validate Excel
3.  Upsert SalarySlip
4.  Store batch history

------------------------------------------------------------------------

# Business Rules

-   One employee belongs to one company.
-   One employee belongs to one branch.
-   One salary slip per employee per month.
-   One Form16 per employee per financial year.
-   Company Admin cannot access another company.
-   Super Admin has unrestricted access.
-   Employee accesses only own records.

------------------------------------------------------------------------

# Recommended Enums

Role - SUPER_ADMIN - ADMIN - EMPLOYEE

Employee Status - PENDING - ACTIVE - INACTIVE - RESIGNED

Application Status - PENDING - APPROVED - REJECTED

------------------------------------------------------------------------

# Future Extensions

Reserved for:

-   Notifications
-   Announcements
-   Push Tokens
-   Mobile Devices

No schema redesign should be required.
