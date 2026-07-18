# 05 - UI / UX Guidelines

**Project:** Employee Salary Management Portal\
**Version:** 1.0

------------------------------------------------------------------------

# Design Philosophy

Build a clean, modern, professional interface focused on speed and
simplicity.

Principles:

-   Mobile First
-   Minimal Clicks
-   Consistent Components
-   Accessible
-   Responsive
-   Professional Appearance

Do **not** use flashy animations or heavy gradients.

------------------------------------------------------------------------

# Design Inspiration

-   Razorpay Dashboard
-   Linear
-   GitHub
-   Notion

------------------------------------------------------------------------

# Color Palette

## Primary

-   Blue (#2563EB)

## Success

-   Green (#16A34A)

## Warning

-   Amber (#D97706)

## Error

-   Red (#DC2626)

## Background

-   White (#FFFFFF)
-   Gray-50 (#F9FAFB)

## Text

-   Gray-900
-   Gray-700
-   Gray-500

Support Dark Mode using Tailwind dark classes.

------------------------------------------------------------------------

# Typography

Font:

-   Inter

Headings

-   H1: 32px
-   H2: 24px
-   H3: 20px

Body

-   16px

Buttons

-   14px Medium

------------------------------------------------------------------------

# Layout

## Desktop

    + Sidebar
    + Top Navbar
    + Main Content

## Tablet

-   Collapsible Sidebar
-   Responsive Tables

## Mobile

Bottom Navigation

-   Dashboard
-   Salary
-   Profile
-   More

Cards replace large tables where possible.

------------------------------------------------------------------------

# Navigation

## Public

-   Home
-   Employee Login
-   Appointment Form
-   Track Application
-   Forgot Password

## Super Admin

-   Dashboard
-   Companies
-   Branches
-   Admins
-   Employees
-   Salary
-   Appointment Forms
-   Reports
-   Settings

## Company Admin

-   Dashboard
-   Employees
-   Salary
-   Appointment Forms
-   Reports

## Employee

-   Dashboard
-   Salary Slips
-   Form16
-   Profile
-   Change Password

------------------------------------------------------------------------

# Dashboard

Cards

-   Employees
-   Pending Registrations
-   Salary Uploads
-   Appointment Forms

Recent Activity panel.

No unnecessary charts.

------------------------------------------------------------------------

# Forms

Guidelines

-   Single-column on mobile
-   Two-column on desktop
-   Required fields marked
-   Inline validation
-   Helpful error messages
-   Auto-save draft for long appointment form (optional)

------------------------------------------------------------------------

# Tables

Features

-   Search
-   Pagination
-   Sort
-   Filter
-   Export

Responsive:

On phones, convert wide tables into stacked cards.

------------------------------------------------------------------------

# Buttons

Primary

-   Filled

Secondary

-   Outline

Danger

-   Red

Loading state required.

------------------------------------------------------------------------

# Modals

Use for

-   Delete confirmation
-   Approval
-   Status changes

Avoid full-screen modals except on mobile.

------------------------------------------------------------------------

# Notifications

Use toast notifications.

Examples

-   Employee Imported
-   Salary Uploaded
-   Form16 Uploaded
-   Profile Updated

------------------------------------------------------------------------

# Empty States

Every empty page should explain what to do next.

Example:

"No salary slips available yet."

------------------------------------------------------------------------

# Loading States

-   Skeleton loaders
-   Button loading spinner
-   Progress indicator for Excel import

------------------------------------------------------------------------

# File Upload

Support drag-and-drop.

Show:

-   File name
-   Size
-   Validation result
-   Import summary

------------------------------------------------------------------------

# Responsive Rules

Breakpoints

-   Mobile \< 768px
-   Tablet 768--1023px
-   Desktop ≥1024px

------------------------------------------------------------------------

# Accessibility

-   Keyboard navigation
-   Visible focus states
-   Color contrast
-   Labels for all inputs
-   Screen reader friendly

------------------------------------------------------------------------

# Component Library

Core Components

-   Button
-   Input
-   Select
-   Date Picker
-   Modal
-   Drawer
-   Card
-   Table
-   Badge
-   Toast
-   Avatar
-   Pagination
-   Breadcrumb
-   Search Box
-   File Upload
-   OTP Input

Components should be reusable across the application.

------------------------------------------------------------------------

# UX Rules

-   Maximum 3 clicks to important actions.
-   Show confirmation before destructive actions.
-   Preserve search/filter state when navigating.
-   Keep forms short and organized.
-   Use consistent spacing (8px grid).
