# 04 - API Specification

**Project:** Employee Salary Management Portal\
**API Style:** REST\
**Authentication:** JWT Bearer Token\
**Base URL:** `/api/v1`

------------------------------------------------------------------------

# API Standards

-   JSON request/response
-   RESTful endpoints
-   HTTPS only
-   Role-based authorization
-   Validation on every request

------------------------------------------------------------------------

# Authentication APIs

## POST /auth/login

Login for Admin and Employee.

### Request

``` json
{
  "email":"user@example.com",
  "password":"Password@123"
}
```

### Response

``` json
{
  "accessToken":"jwt",
  "refreshToken":"jwt",
  "user":{
    "id":"uuid",
    "role":"ADMIN"
  }
}
```

------------------------------------------------------------------------

## POST /auth/request-registration

Employee starts first registration.

Request

``` json
{
  "employeeCode":"EMP001",
  "email":"employee@example.com"
}
```

Response

``` json
{
  "message":"OTP sent successfully."
}
```

------------------------------------------------------------------------

## POST /auth/verify-otp

Verify OTP.

Request

``` json
{
  "email":"employee@example.com",
  "otp":"123456"
}
```

------------------------------------------------------------------------

## POST /auth/create-password

Creates employee password after OTP verification.

------------------------------------------------------------------------

## POST /auth/forgot-password

Sends reset OTP.

------------------------------------------------------------------------

## POST /auth/reset-password

Changes password.

------------------------------------------------------------------------

# Employee APIs

## GET /employees

Returns employees for current company.

Supports:

-   search
-   pagination
-   status

------------------------------------------------------------------------

## GET /employees/:id

Employee details.

------------------------------------------------------------------------

## POST /employees

Create employee manually.

------------------------------------------------------------------------

## PUT /employees/:id

Update employee.

------------------------------------------------------------------------

## PATCH /employees/:id/status

Activate, deactivate or resign employee.

------------------------------------------------------------------------

## POST /employees/import

Upload employee Excel.

Workflow

Upload

↓

Preview

↓

Validation

↓

Import

------------------------------------------------------------------------

## GET /employees/export

Exports employee Excel.

------------------------------------------------------------------------

# Salary APIs

## POST /salary/import

Upload salary Excel.

Returns

-   Imported
-   Updated
-   Failed

------------------------------------------------------------------------

## GET /salary

List salary batches.

------------------------------------------------------------------------

## GET /salary/:id

Batch details.

------------------------------------------------------------------------

## DELETE /salary/:id

Delete salary batch.

------------------------------------------------------------------------

## GET /salary/slips

Employee salary slips.

Supports

month

year

------------------------------------------------------------------------

## GET /salary/slips/:id

Salary slip details.

------------------------------------------------------------------------

## GET /salary/slips/:id/download

Downloads salary PDF.

------------------------------------------------------------------------

# Form16 APIs

## POST /form16/upload

Upload Form16.

------------------------------------------------------------------------

## GET /form16

Employee Form16 list.

------------------------------------------------------------------------

## GET /form16/:id/download

Download Form16 PDF.

------------------------------------------------------------------------

# Appointment APIs

## POST /appointments

Public appointment form.

------------------------------------------------------------------------

## GET /appointments

Admin list.

Filters

-   Pending
-   Approved
-   Rejected

------------------------------------------------------------------------

## GET /appointments/:id

View application.

------------------------------------------------------------------------

## PATCH /appointments/:id/approve

Approve application.

------------------------------------------------------------------------

## PATCH /appointments/:id/reject

Reject application.

------------------------------------------------------------------------

## GET /appointments/status/:applicationNo

Public application status.

------------------------------------------------------------------------

# Profile APIs

## GET /profile

Current employee profile.

------------------------------------------------------------------------

## PUT /profile

Update editable profile fields.

------------------------------------------------------------------------

## POST /profile/photo

Upload profile image.

------------------------------------------------------------------------

## POST /profile/change-password

Change current password.

------------------------------------------------------------------------

# Reports APIs

## GET /reports/employees

Employee report.

------------------------------------------------------------------------

## GET /reports/salary

Monthly salary report.

------------------------------------------------------------------------

## GET /reports/registrations

Pending registrations.

------------------------------------------------------------------------

## GET /reports/appointments

Appointment report.

------------------------------------------------------------------------

# Settings APIs

## GET /settings

Load settings.

------------------------------------------------------------------------

## PUT /settings

Update settings.

------------------------------------------------------------------------

# Response Format

Success

``` json
{
  "success": true,
  "message":"Completed",
  "data": {}
}
```

Error

``` json
{
  "success": false,
  "message":"Validation failed",
  "errors":[]
}
```

------------------------------------------------------------------------

# HTTP Status Codes

  Code   Meaning
  ------ ------------------
  200    Success
  201    Created
  400    Bad Request
  401    Unauthorized
  403    Forbidden
  404    Not Found
  409    Conflict
  422    Validation Error
  500    Server Error

------------------------------------------------------------------------

# Authorization Matrix

  Endpoint               Super Admin   Admin     Employee
  --------------------- ------------- ------- --------------
  Manage Employees            ✔          ✔          ✖
  Import Salary               ✔          ✔          ✖
  Approve Appointment         ✔          ✔          ✖
  View Own Salary             ✔          ✔     ✔ (Own Only)
  Download Form16             ✔          ✔     ✔ (Own Only)

------------------------------------------------------------------------

# Versioning

Current Version

`/api/v1`

Future changes must create `/api/v2` instead of breaking existing
clients.
