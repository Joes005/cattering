# PLATED – Software Requirements Specification: Role 03 Employee (Workforce Marketplace)
**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Role:** Freelance & Independent Part-Time Catering Professional  
**Business Domain:** Catering Services Workforce Marketplace

---

## 1. Role Purpose & Definition

The **Employee** represents autonomous, independent catering professionals operating on the PLATED platform. Unlike traditional employees tied permanently to one company, PLATED workers are flexible, freelance professionals who can independently:
- Register on the platform with personal and professional credentials.
- Maintain a dynamic catering skills portfolio (Chefs, Line Cooks, Waitstaff, Bartenders, Captains, Cleaners).
- Set location preferences, hourly rates, and working day availability.
- Discover and apply for catering event shifts posted by verified catering employers.
- Track application statuses (Applied, Shortlisted, Accepted, Rejected, Withdrawn).
- View confirmed shift schedules across all employers.
- Perform real-time digital check-in and check-out attendance at event venues.
- View an itemized earnings ledger showing gross earnings, platform commission deductions, and net payouts.

---

## 2. Functional Requirements

### FR-EMP-01: Independent Registration & Authentication
- Independent signup via `/api/auth/employee/register` with full name, email, password, phone, location, skills, experience, and preferred work type.
- Email/password authentication via `/api/auth/employee/login`.
- Auto-provisioning of `EmployeeProfile` linked to `User` entity.
- Profile verification status tracking (`status = 'active'`).

### FR-EMP-02: Profile & Skills Management
- Update profile information (`skills`, `bio`, `location`, `work_experience_years`, `availability_status`, `preferred_days`, `hourly_rate`).
- Maintain performance track record: `rating` (starts at 5.0) and `total_completed_events` (auto-incremented on shift completion).

### FR-EMP-03: Marketplace Shift Discovery & Applications
- Browse open catering event shifts (`GET /api/employee/jobs`) with filtering by role and keyword search.
- View shift details: event title, venue, date, shift timing, hourly pay rate, required skills, and caterer profile.
- Apply for an open shift (`POST /api/employee/jobs/{id}/apply`) with an optional cover note.
- Prevent duplicate applications for the same job posting.
- Track submitted applications (`GET /api/employee/applications`) with status progression: `applied` $\to$ `shortlisted` $\to$ `accepted` $\to$ `rejected` $\to$ `withdrawn`.
- Allow withdrawal of pending applications (`DELETE /api/employee/applications/{id}`).

### FR-EMP-04: Confirmed Schedule & Digital Attendance
- List all confirmed shift assignments (`GET /api/employee/schedule`) with caterer details, venue, time window, and agreed hourly rate.
- Digital Clock-In (`POST /api/employee/attendance/check` or `/api/employee/assignments/{id}/check-in`): marks arrival at venue, updates assignment status to `in_progress`.
- Digital Clock-Out (`POST /api/employee/attendance/check` or `/api/employee/assignments/{id}/check-out`): calculates total hours worked, updates assignment status to `completed`, increments `total_completed_events`.
- Attendance history tracking (`GET /api/employee/attendance`).

### FR-EMP-05: Earnings & Payout Ledger
- Summary cards: Total Gross Earnings, Settled Payouts, Pending Settlement.
- Itemized payout history per shift (`GET /api/employee/earnings`): event title, caterer name, hours worked, agreed pay rate, gross amount, payout status (`pending`, `approved`, `paid`), and settlement reference.

---

## 3. Data Integrity & Boundary Rules
1. **No Employer Lock-in:** An employee can accept shifts from multiple employers across the platform.
2. **Shift Collision Prevention:** An employee cannot have overlapping confirmed shifts for the exact same event time window.
3. **Transparent Earnings:** All earnings reflect verified attendance and agreed pay rate.
4. **Access Control:** Employees cannot access private catering business management SaaS tools (Quotations, Invoices, Client CRM, Inventory).

