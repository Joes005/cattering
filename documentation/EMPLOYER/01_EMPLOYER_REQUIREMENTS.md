# PLATED Employer Module – System Requirements Specification (SRS)

## 1. Document Information & Version
- **Document Title:** PLATED Platform Employer & Catering Business Module — System Requirements Specification
- **Document Identifier:** `PLATED-SRS-EMPLOYER-01`
- **Version:** `1.0.0`
- **Status:** Approved Specification
- **Author:** System Architecture & Engineering Team
- **Date:** November 22, 2026
- **Target Release:** PLATED Core v3.1.0
- **Platform Role:** `ROLE 02 – EMPLOYER`

---

## 2. Role Overview & Business Objectives
The **Employer** role represents catering business owners, boutique caterers, banquet hall operators, and multi-branch hospitality groups.
In the PLATED ecosystem, an Employer operates on two intertwined planes:
1. **Multi-Tenant Operating SaaS:** Running their end-to-end catering operations (enquiry → quotation → booking → staffing → execution → invoicing → customer CRM → inventory → reports).
2. **Workforce Marketplace Consumer:** Publishing on-demand event staffing shifts (Chefs, Commis, Servers, Bartenders, Kitchen Helpers), reviewing applicant credentials, scheduling shift times, tracking digital attendance, and disbursing shift pay.

### Core Architecture Principle: Multi-Business Ownership
**One Employer user account can register, own, and switch between multiple independent catering businesses.**
- Each business has its own distinct `company_id`, brand identity, GSTIN license, bank details, customers, events, inventory, and staff rosters.
- Operational data between businesses is strictly tenant-isolated.

---

## 3. Employer Responsibilities & Scope
1. **Business Registration & Profiles:** Register one or multiple catering enterprises, configure brand logos, GST details, cuisine specialties, and service addresses.
2. **Customer CRM:** Maintain decoupled, tenant-owned customer contacts, booking histories, dietary preferences, and billing records.
3. **Catering Services & Menus:** Build customizable food item libraries, category hierarchies, dietary tags (Veg, Non-Veg, Jain, Vegan), and packaged combination deals.
4. **Enquiry & Booking Lifecycle:** Receive client event requirements, generate professional itemized quotations, track customer acceptances, collect advance deposits, and confirm bookings.
5. **Operational Event Execution:** Manage event timelines, venue logistics, operational task phases (Pre-Event, Event Day, Post-Event), and photo-verified task completions.
6. **Workforce Marketplace Hiring:** Post event shift requirements, review freelance employee profiles and ratings, confirm shift assignments, digitally verify check-in/out attendance, and approve earnings.
7. **Financials & Invoicing:** Issue GST-compliant itemized tax invoices, record advance and final payments, and track outstanding receivables.
8. **Inventory & Suppliers:** Monitor perishable and non-perishable ingredient stock levels, record usage transactions per event, and maintain vendor supplier contacts.
9. **SaaS Subscription Governance:** Review active subscription plan entitlements (Starter, Growth, Business), monitor usage against event/customer caps, and upgrade billing cycles.

---

## 4. Functional Requirements

### FR-EMP-01: Multi-Business Account Governance
- **FR-01.1:** Dedicated Employer registration at `/register/employer` and login at `/employer/login`.
- **FR-01.2:** Multi-business registry: An authenticated employer can register an additional catering business via `POST /api/companies`. Each newly registered business enters `pending_approval` status requiring Admin verification.
- **FR-01.3:** Business Context Switcher: Employer UI topbar allows one-click switching between owned catering businesses, updating the active `company_id` across all operations.

### FR-EMP-02: Customer Management (CRM)
- **FR-02.1:** Create, update, list, and soft-delete customer records under the active `company_id`.
- **FR-02.2:** Customer records are pure business contacts belonging to the employer's tenant boundary and do not require platform login credentials.

### FR-EMP-03: Event & Booking Operations
- **FR-03.1:** Create catering events linked to customer records with date, guest count, venue address, catering requirement, and special instructions.
- **FR-03.2:** State machine enforcement across event lifecycles:
  `enquiry` → `quotation_sent` → `awaiting_approval` → `advance_pending` → `confirmed` → `preparation` → `in_progress` → `completed` (or terminal `cancelled` / `rejected`).
- **FR-03.3:** Event operational tasks categorized by phase (`pre_event`, `event_day`, `post_event`) with assignment to team members and photo proof upload.

### FR-EMP-04: Menus & Packages Builder
- **FR-04.1:** Menu category hierarchy with custom sort order.
- **FR-04.2:** Dish library with veg/non-veg classification, dietary tags, allergen declarations, and base prices.
- **FR-04.3:** Multi-item packages with per-guest or flat pricing models.

### FR-EMP-05: Quotations & Invoicing
- **FR-05.1:** Generate itemized price quotations from menu items or packages with configurable discount %, GST %, service charges, and required advance deposit amount.
- **FR-05.2:** One-click invoice generation from accepted quotations.
- **FR-05.3:** Payment recording (Advance, Partial, Final, Refund) automatically updating invoice balances and advancing booking states.

### FR-EMP-06: Workforce Marketplace Hiring
- **FR-06.1:** Publish shift job postings linked directly to an event (specifying role title, shift timings, required headcount, and fixed or hourly pay rate).
- **FR-06.2:** Review employee applications (inspecting public worker profile, experience years, verified skills, and rating).
- **FR-06.3:** Accept or decline applications. Acceptance creates confirmed `employee_assignments`.
- **FR-06.4:** Digital attendance verification: Verify employee check-in and check-out timestamps and hours worked.
- **FR-06.5:** Approve shift payouts, automatically generating records in `employee_earnings` and platform commission ledgers.

### FR-EMP-07: SaaS Subscription Management
- **FR-07.1:** View current subscription tier, active entitlement limits, and renewal dates.
- **FR-07.2:** Self-serve tier selection and subscription checkout for monthly or annual billing.

---

## 5. Security & Tenant Isolation Rules
1. **Tenant Isolation:** Every employer-owned resource must validate `company.owner_id == current_user.id` and match the route `company_id`. Violations return 404 Not Found to prevent data sniffing.
2. **Approval Gate:** If a catering business is in `pending_approval` or `rejected` state, all operational endpoints (event creation, quotations, marketplace job postings) return HTTP 403 Forbidden.
3. **Data Protection:** Financial bank details and customer contact records must never be exposed across company boundaries.

