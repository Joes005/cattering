# Phase 1: Current State Audit & Architectural Gap Analysis

**Project:** Plated — Multi-Tenant Catering Business Management & Workforce Marketplace  
**Repository Path:** `/home/joes_17/Documents/plated-project-final`  
**Audit Date:** November 19, 2026  
**Document Version:** 1.0.0  

---

## 1. Executive Summary & Purpose

This document provides a comprehensive audit of the current Plated codebase as a foundation for transitioning from the legacy multi-tenant SaaS model to the **strict 3-Role Architecture**:
1. **Admin** (Platform Owner)
2. **Employer** (Catering Business Owner)
3. **Employee** (Workforce / Freelance Catering Staff)

Currently, the application contains:
- An obsolete **Client** platform user role that confuses external party customers with authenticated system users.
- An inverted **Company Member** hierarchy (`owner`, `manager`, `staff` with 49 permission keys and overrides) that traps employees inside a single company instead of enabling a cross-company workforce marketplace.
- Unmonitored, instant employer registration without admin review or approval gates.
- An absence of a true workforce marketplace (job postings, applications, multi-employer assignment schedules).

---

## 2. Codebase Architecture Overview

### 2.1 File & Code Metrics
| Area | Path | Files | Line Count | Key Technologies |
|---|---|---|---|---|
| **Backend Core** | `backend/app/` | 35 `.py` files | 4,402 lines | FastAPI 0.115, SQLAlchemy 2.0, Alembic, Pydantic 2.9, PostgreSQL |
| **Frontend** | `frontend/src/` | 41 `.jsx`/`.js` files | 4,833 lines | React 18, Vite 5.4, Tailwind CSS, TanStack Query 5, Recharts |
| **Database Migrations** | `backend/alembic/` | 1 revision | 468 lines | Revision `81fa60fd8811` (32 total tables in PostgreSQL) |
| **Legacy Express App** | `legacy/backend-express/` | Archived | — | Previous Node.js/Express implementation (deprecated) |

---

## 3. Detailed Backend Audit

### 3.1 Authentication & Role System (`backend/app/core/security.py`, `backend/app/routers/auth.py`)
- **Current Roles Defined:**
  `GlobalRole` enum: `admin`, `company_user`, `client`.
  `EmploymentRole` enum: `owner`, `manager`, `staff`.
- **Current Login & Registration Endpoints:**
  - `POST /api/auth/signup`: Creates a `client` role user.
  - `POST /api/auth/company-signup`: Self-serve company registration. Automatically creates the company and owner, immediately logging them in without any approval gate.
  - `POST /api/auth/login`: Single generic login endpoint for all roles.
  - `GET /api/auth/me`: Returns user, memberships, and effective permissions.
- **Flaws Identified:**
  1. No separate, isolated `/admin` authentication.
  2. No `/register/employer` with approval pending workflow.
  3. No `/register/employee` or `/employee/login`.
  4. Public client signup pollutes the authentication domain with non-workforce users.

### 3.2 Authorization & Permissions (`backend/app/core/permissions.py`)
- **Current State:** 49 granular permissions spread across 17 modules (`events.*`, `menus.*`, `quotes.*`, `employees.*`, `invoices.*`, etc.), mapped to `DEFAULT_ROLE_PERMISSIONS` and stored in `permissions`, `role_permissions`, and `member_permission_overrides` tables.
- **Flaws Identified:**
  - Overengineered ACL layer for internal company employees (`manager` vs `staff`).
  - Employees are treated as sub-users of a single company rather than independent platform workers.
  - Unnecessary overhead: queries `member_permission_overrides` on every request.
  - Does NOT enforce cross-employer workforce operations.

### 3.3 Database Models (`backend/app/models/models.py`)
There are currently 32 tables in PostgreSQL:
1. `users`: Stores global user accounts (`global_role`: `admin`, `company_user`, `client`).
2. `clients`: Has an FK to `users.id`! Stores client profile linked to a login account.
3. `companies`: Catering business details, status (`active`, `suspended`). Missing `pending_approval` and `rejected` states.
4. `company_members`: Binds `user_id` strictly to one `company_id`. Prevents employees from working across multiple companies.
5. `permissions`, `role_permissions`, `member_permission_overrides`: 3 tables managing the legacy 49-permission matrix.
6. `events`: Linked to `client_id` (FK to `clients`).
7. `event_staff`: Assigns `company_member_id` to an event.
8. `event_tasks`: Event operational tasks.
9. `attendance`: Check-in/check-out tied to `company_member_id`.
10. `quotations` & `quotation_items`: Price proposals sent to clients.
11. `invoices` & `invoice_items`: Invoices sent to clients.
12. `payments`: Payment records.
13. `menus`, `menu_items`, `menu_categories`, `packages`, `package_items`: Menu management.
14. `inventory_items`, `inventory_transactions`, `suppliers`: Inventory management.
15. `documents`: File uploads (`uploads/{company_id}/`).
16. `messages`: Per-event chat between caterer and client.
17. `notifications`: In-app notification center.
18. `feedback`: Client reviews.
19. `audit_logs`: Activity tracking.
20. `settings`, `subscriptions`: Legacy SaaS settings.

### 3.4 Router Inventory & Classification
| Router File | Current Prefix | Purpose | Target Action |
|---|---|---|---|
| `auth.py` | `/api/auth` | Login/Signup/Me | **Refactor:** Support 3 dedicated role auth flows + employer approval |
| `companies.py` | `/api/companies` | Company CRUD & Settings | **Refactor:** Employer business profile + Admin employer management |
| `events.py` | `/api/companies/{id}/events` | Employer Event CRUD | **Keep & Refactor:** Ensure strict employer tenant isolation |
| `clients.py` | `/api/companies/{id}/clients` | Client record CRUD | **Refactor to Customers:** Pure business records, decouple from `users` |
| `me_events.py` | `/api/me/events` | Client portal event view/booking | **Remove:** Replace with Employee assignment & schedule endpoints |
| `me_quotations.py`| `/api/me/events/{id}/quotations`| Client portal quote acceptance | **Remove:** Quotes are employer-managed business documents |
| `me_invoices.py` | `/api/me/invoices` | Client portal invoice view | **Remove:** Invoices are employer-managed business documents |
| `me_payments.py` | `/api/me/invoices/{id}/pay` | Client portal payment gateway | **Remove:** Payments are recorded by employers or via customer links |
| `me_messages.py` | `/api/me/events/{id}/messages` | Client chat | **Refactor:** Employer ↔ Assigned Employee communication |
| `me_work.py` | `/api/me/*` | Staff today's assignments | **Expand into Employee Portal:** `/api/employee/*` (jobs, applications, schedule) |
| `staff.py` | `/api/companies/{id}/events/{eid}/staff` | Staff assignment | **Refactor:** Shift to Marketplace Assignment model |
| `tasks.py` | `/api/companies/{id}/events/{eid}/tasks` | Event tasks | **Keep:** Scoped to employer event |
| `attendance.py`| `/api/companies/{id}/events/{eid}/attendance`| Event attendance | **Keep & Refactor:** Link to employee user, not company_member |
| `quotations.py`| `/api/companies/{id}/events/{eid}/quotations`| Employer quotes | **Keep:** Scoped to employer event & customer |
| `invoices.py` | `/api/companies/{id}/invoices` | Employer invoices | **Keep:** Scoped to employer event & customer |
| `payments.py` | `/api/companies/{id}/payments` | Employer payments | **Keep:** Financial transactions |
| `menus.py` | `/api/companies/{id}/menus` | Menu items | **Keep:** Employer business data |
| `packages.py` | `/api/companies/{id}/packages` | Menu packages | **Keep:** Employer business data |
| `inventory.py`| `/api/companies/{id}/inventory`| Stock tracking | **Keep:** Employer business data |
| `documents.py`| `/api/companies/{id}/documents`| Document uploads | **Secure & Refactor:** Remove static mount; require authenticated stream |
| `feedback.py` | `/api/companies/{id}/events/{eid}/feedback`| Event feedback | **Keep:** Customer/Event feedback records |
| `notifications.py`| `/api/notifications` | Notifications | **Keep:** Multi-role notifications |
| `audit_logs.py`| `/api/audit-logs` | Audit trail | **Keep:** Admin and Employer audit logs |
| `reports.py` | `/api/companies/{id}/reports` | Revenue & sales reports | **Keep:** Employer business analytics |
| `users.py` | `/api/users` | Admin user CRUD | **Refactor:** Admin employer & employee management |
| `members.py` | `/api/companies/{id}/members` | Company staff membership | **Deprecate/Replace:** Transition to Employee Marketplace Profiles |

---

## 4. Detailed Frontend Audit

### 4.1 Routing & Guards (`frontend/src/App.jsx`, `frontend/src/router/guards.jsx`)
- **Current Portals:**
  - `/admin/*`: Protected by `RequireAuth roles={['admin']}`.
  - `/company/*`: Protected by `RequireAuth roles={['company_user']}` and granular `RequirePermission`.
  - `/client/*`: Protected by `RequireAuth roles={['client']}`.
- **Flaws Identified:**
  1. `/client` portal handles event booking (`/client/book`), quotes, and invoices as a customer portal. Under the new architecture, customers are business contacts managed by employers.
  2. No dedicated `/employee/*` portal with job browsing, job applications, multi-employer schedule, and earnings.
  3. No dedicated `/employer/*` URL namespace (currently uses `/company/*`).
  4. Authentication pages (`/login`, `/signup`, `/signup/company`) do not provide the required dedicated routes (`/admin`, `/employer/login`, `/register/employer`, `/employee/login`, `/register/employee`).

### 4.2 Page Inventory & Target Mapping
| Current Page Component | Current Route | Status in New Architecture |
|---|---|---|
| `pages/Home.jsx` | `/` | **Update:** Landing page linking to Employer and Employee registration/login |
| `pages/Login.jsx` | `/login` | **Refactor:** Dedicated logins for Employer (`/employer/login`) and Employee (`/employee/login`) |
| `pages/Signup.jsx` | `/signup` | **Remove:** Was client signup; replace with `/register/employee` |
| `pages/CompanySignup.jsx` | `/signup/company` | **Refactor to `/register/employer`:** Add approval pending state screen |
| `pages/admin/Dashboard.jsx` | `/admin` | **Refactor:** Monitor platform metrics, pending employers, workforce stats |
| `pages/admin/Companies.jsx` | `/admin/companies` | **Refactor to `/admin/employers`:** Add Approval/Rejection & Verification actions |
| `pages/admin/Users.jsx` | `/admin/users` | **Refactor to `/admin/employees`:** Manage platform employee workforce |
| `pages/admin/AuditLogs.jsx` | `/admin/audit-logs` | **Keep:** Audit monitoring |
| `pages/company/Dashboard.jsx` | `/company` | **Refactor to `/employer/dashboard`:** Employer business overview |
| `pages/company/Events.jsx` | `/company/events` | **Refactor to `/employer/events`:** Event management |
| `pages/company/EventDetail.jsx`| `/company/events/:id` | **Refactor to `/employer/events/:id`:** Add Workforce Requirements tab |
| `pages/company/Clients.jsx` | `/company/clients` | **Refactor to `/employer/customers`:** Customer records management |
| `pages/company/Employees.jsx` | `/company/employees` | **Refactor to `/employer/workforce`:** Search & hire freelance employees |
| `pages/company/MenusPackages.jsx`| `/company/menus` | **Refactor to `/employer/menus`:** Menu management |
| `pages/company/Inventory.jsx` | `/company/inventory` | **Refactor to `/employer/inventory`:** Stock management |
| `pages/company/Reports.jsx` | `/company/reports` | **Refactor to `/employer/reports`:** Financial and operational reports |
| `pages/company/Settings.jsx` | `/company/settings` | **Refactor to `/employer/settings`:** Business profile & settings |
| `pages/client/Dashboard.jsx` | `/client` | **DELETE:** Obsolete client portal |
| `pages/client/BookEvent.jsx` | `/client/book` | **DELETE:** Obsolete client portal |
| `pages/client/EventDetail.jsx`| `/client/events/:id` | **DELETE:** Obsolete client portal |
| *New: Employee Dashboard* | `/employee/dashboard` | **CREATE:** Jobs, active assignments, earnings summary |
| *New: Employee Profile* | `/employee/profile` | **CREATE:** Skills, location, experience, availability |
| *New: Job Marketplace* | `/employee/jobs` | **CREATE:** Browse catering job postings with filters |
| *New: Applications* | `/employee/applications` | **CREATE:** View & track job applications |
| *New: Assignments & Schedule*| `/employee/schedule` | **CREATE:** Confirmed assignments across employers |
| *New: Employee Attendance* | `/employee/attendance` | **CREATE:** Event check-in/out & history |
| *New: Employee Earnings* | `/employee/earnings` | **CREATE:** Event-wise earnings & payout status |

---

## 5. Security Vulnerabilities & Technical Debt

1. **Static Unauthenticated Document Access (`backend/app/main.py:52`)**
   ```python
   app.mount("/files", StaticFiles(directory=settings.UPLOAD_DIR), name="files")
   ```
   All uploaded documents (contracts, event agreements, invoices) are publicly accessible without authentication.
2. **Wildcard CORS (`backend/app/main.py:47`)**
   `allow_origins=["*"]` allows any web origin to issue credentialed requests.
3. **No Approval Enforcement on Company Registration**
   Catering companies can immediately perform operations without platform verification.
4. **Zero Automated Test Coverage**
   No pytest or vitest tests exist to ensure tenant isolation or role boundaries.
5. **Dead Legacy Directory**
   `legacy/backend-express/` contains an abandoned Express.js backend that must be safely archived or removed.

---

## 6. Audit Conclusion & Next Steps

The audit confirms that the core catering business features (events, quotations, invoices, menus, inventory, attendance) are sound and well-implemented, but the identity and access architecture must be fundamentally restructured:
- Replace `client` and `company_user` with **`employer`** and **`employee`**.
- Establish the **Workforce Marketplace** domain.
- Transition `clients` into pure company-owned **`customers`** without system credentials.
- Restructure database models and routing to reflect the 3 roles cleanly.

