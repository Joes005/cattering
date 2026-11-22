# PLATED Admin Module – System Requirements Specification (SRS)

## 1. Document Information & Version
- **Document Title:** PLATED Platform Administration Module — Requirements & Architecture Specification
- **Document Identifier:** `PLATED-SRS-ADMIN-01`
- **Version:** `1.0.0`
- **Status:** Approved
- **Author:** System Architecture & Engineering Team
- **Date:** November 22, 2026
- **Target Release:** PLATED Core v3.1.0

---

## 2. Product Overview
PLATED is a **Hybrid SaaS + Marketplace Platform** servicing the hospitality and event catering industry:
1. **Multi-Tenant Catering SaaS:** Catering businesses (**Employers**) manage client enquiries, customer relationships (CRM), itemized quotations, invoices, multi-phase event operations, menus, and inventory with strict tenant isolation.
2. **Workforce Marketplace:** Independent freelance catering professionals, chefs, and servers (**Employees**) discover shift postings published by employers, submit applications, execute shifts with digital timestamp attendance, and receive shift earnings.
3. **Platform Monetization Model:**
   - **SaaS Subscriptions:** Tiered monthly/annual recurring subscription fees collected from Catering Employers for access to the business operating system.
   - **Catering Marketplace Commission:** Percentage-based commission on catering bookings facilitated through platform channels.
   - **Workforce Marketplace Commission:** Platform service fee deducted from workforce transactions / shift payout settlements.
4. **Platform Governance:** The **Admin** module serves as the command center for platform owners and operators to oversee platform trust, verify businesses, manage subscriptions, track commissions, monitor financial flows, resolve disputes, and maintain auditability.

---

## 3. Admin Role Purpose
The Admin role represents the superuser and governing operator of the PLATED ecosystem. The purpose of the Admin is to:
- Guarantee platform safety, legality, and food service credibility by verifying catering employers and workforce staff.
- Administer platform monetization (subscriptions, commissions, payment gateways).
- Supervise cross-tenant operations without violating individual tenant privacy.
- Intervene in operational deadlocks, disputes, and compliance violations.
- Maintain complete accountability via tamper-evident audit logging.

---

## 4. Admin Responsibilities
1. **Verification & Onboarding:** Review business legal documentation (GSTIN, FSSAI licenses) and approve/reject employer applications.
2. **Account Governance:** Suspend, reactivate, or terminate non-compliant Employer or Employee accounts.
3. **Monetization & Billing Control:** Manage subscription plans, monitor overdue subscriptions, track marketplace commissions, and supervise payment settlements.
4. **Workforce Oversight:** Oversee freelance workforce quality, ratings, dispute resolutions, and shift completion metrics.
5. **Operational Health Monitoring:** Track platform-wide event delivery rates, venue safety compliance, and system health.
6. **Security & Audit Inspection:** Review security events, unauthorized access attempts, and administrative action logs.

---

## 5. Admin Scope & Boundaries
- **In Scope:**
  - Read access to all platform entities across all tenant companies.
  - Write access to platform-level entities: user account statuses, company verification states, subscription plans, commission rates, and system parameters.
  - Review and dispute moderation on transactions, invoices, and employee payouts.
- **Out of Scope (Administrative Boundaries):**
  - Admins do **NOT** author internal company recipes, menus, or private catering proposals on behalf of employers.
  - Admins do **NOT** check-in or clock-out for workforce employees at event venues.
  - Admins do **NOT** modify customer private contact details unless responding to GDPR/data privacy requests.
  - Admins do **NOT** directly initiate unauthorized bank transfers outside of verified payment gateway integration workflows.

---

## 6. Admin Functional Requirements

### FR-ADM-01: Administrative Authentication & Session Governance
- **FR-01.1 [Implemented]:** Dedicated administrator login interface at `/admin/login` consuming `POST /api/auth/admin/login`.
- **FR-01.2 [Implemented]:** Strict rejection of non-admin roles (`employer`, `employee`, `customer`) with HTTP 403 Forbidden.
- **FR-01.3 [Proposed]:** Multi-Factor Authentication (MFA / TOTP) requirement for all accounts possessing Admin privileges.
- **FR-01.4 [Proposed]:** Session inactivity auto-logout after 30 minutes of idle time.
- **FR-01.5 [Proposed]:** JWT token revocation on logout or password change via server-side blacklist / Redis token tracking.

### FR-ADM-02: Platform Metrics & Dashboard Analytics
- **FR-02.1 [Implemented]:** Real-time KPI summary: Total Employers, Pending Employers, Approved Employers, Total Employees, Total Events, Total Invoiced Revenue, Open Job Shifts (`GET /api/admin/stats`).
- **FR-02.2 [Proposed]:** Platform Commission KPIs: Total SaaS Subscription ARR/MRR, Total Marketplace Catering Commissions, Total Workforce Commissions Collected.
- **FR-02.3 [Proposed]:** Time-series charts for monthly booking volume, workforce shift fulfillment rate, and revenue breakdown.
- **FR-02.4 [Partially Implemented]:** Actionable Pending Approval queue embedded directly within the dashboard view.

---

## 7. Admin Module Definitions
1. **Dashboard & Metrics Module:** High-level platform health, KPI counters, and operational alerts.
2. **Employer & Business Governance Module:** Review, KYC verification, status toggle, and tenant inspection.
3. **Workforce & Employee Module:** Staff profiles, ratings, hourly benchmarks, and account status management.
4. **Subscription Management Module:** SaaS subscription tiers, billing cycles, invoice history, and access gating.
5. **Marketplace & Commission Module:** Commission rules, transaction split monitoring, and ledger reconciliation.
6. **Dispute & Support Module:** Escalation tickets between customers, employers, and employees.
7. **System Audit & Governance Module:** Searchable, immutable event trail of platform mutations.
8. **Platform Settings Module:** Global tax rates, feature flags, maintenance mode, and gateway keys.

---

## 8. User Management Requirements
- **FR-08.1 [Implemented]:** Platform-wide listing of all registered users with role and status filtering.
- **FR-08.2 [Implemented]:** Individual account status mutation (`active` ↔ `suspended` ↔ `pending`).
- **FR-08.3 [Proposed]:** Dedicated Admin User Provisioning CLI / internal API to create administrative operators with least-privilege scoping (e.g., `SuperAdmin`, `SupportAdmin`, `BillingAdmin`).
- **FR-08.4 [Proposed]:** Soft-delete and GDPR-compliant data sanitization workflow for user account removal.

---

## 9. Business (Employer) Verification Requirements
- **FR-09.1 [Implemented]:** Employer self-registration creates company in `pending_approval` state, blocking operational API access until approved.
- **FR-09.2 [Partially Implemented - Backend Ready, Frontend Misaligned]:** Admin review pipeline allowing one-click **Approval** or **Rejection** with recorded mandatory rejection reason.
- **FR-09.3 [Proposed]:** Document verification portal: Admins inspect uploaded GSTIN registration certificates and FSSAI food hygiene licenses.
- **FR-09.4 [Proposed]:** Automated GSTIN validation via external government portal / API integration.
- **FR-09.5 [Implemented]:** Logging of approver identity (`approved_by`), timestamp (`approved_at`), and status history in `audit_logs`.

---

## 10. Employee Workforce Verification Requirements
- **FR-10.1 [Implemented]:** Platform-wide employee registry displaying name, location, skills array, experience years, and rating.
- **FR-10.2 [Implemented]:** Immediate workforce account suspension capability to block untrusted staff from applying to shifts.
- **FR-10.3 [Proposed]:** Skill & ID verification badge: Admins review government ID proofs (Aadhaar / National ID) and hospitality training certifications.
- **FR-10.4 [Proposed]:** Workforce reliability score: Track shift attendance ratios (present vs no-show vs late) with automated suspension thresholds.

---

## 11. Subscription Management Requirements (SaaS)
*Status: Proposed New Implementation (Legacy table dropped in v2 restructure)*
- **FR-11.1 [Proposed]:** Definition of SaaS Subscription Plans:
  - Plan Code, Name, Monthly Price, Annual Price, Currency (`INR`).
  - Limits: Max Active Events/month, Max Customers, Max Staff Shifts, Custom Branding enabled.
- **FR-11.2 [Proposed]:** Employer Subscription Lifecycle:
  - States: `trialing`, `active`, `past_due`, `cancelled`, `expired`.
  - Grace period configuration (default 7 days) before locking employer dashboard.
- **FR-11.3 [Proposed]:** Admin Manual Override: Capability for Admins to grant subscription extensions, fee waivers, or custom enterprise terms.

---

## 12. Commission Management Requirements (Marketplace)
*Status: Proposed New Implementation*
- **FR-12.1 [Proposed]:** Platform Commission Engine:
  - **Catering Booking Commission:** Configurable default percentage (e.g. 5.0% - 12.0%) applied to eligible marketplace catering bookings.
  - **Workforce Transaction Commission:** Configurable percentage (e.g. 8.0% - 15.0%) deducted from shift pay or charged as employer convenience fee.
- **FR-12.2 [Proposed]:** Tiered / Category Commission Overrides: Capability to configure custom commission rates per business or event category.
- **FR-12.3 [Proposed]:** Commission Ledger: Immutable financial ledger tracking Gross Booking Value, Platform Commission Cut, Payment Gateway Fee, and Net Payout.

---

## 13. Transaction Management Requirements
*Status: Partially Implemented (Payments & Earnings exist; unified transaction ledger required)*
- **FR-13.1 [Implemented]:** Inspection of client event payments (`payments` table) and shift earnings (`employee_earnings` table).
- **FR-13.2 [Proposed]:** Unified Platform Transaction Viewer: Single consolidated search across customer payments, employer subscription charges, and employee shift disbursements.
- **FR-13.3 [Proposed]:** Export transaction ledger to CSV/Excel for accounting and GST audit compliance.

---

## 14. Refund and Settlement Requirements
- **FR-14.1 [Partially Implemented in Backend]:** Recording of refund transactions (`PaymentType.refund` in `payments`).
- **FR-14.2 [Proposed]:** Admin Refund Authorization: Multi-party refund review for cancelled events, calculating non-refundable catering advance vs recoverable deposit.
- **FR-14.3 [Proposed]:** Employee Shift Pay Settlement: Admin batch payout release or automated gateway payout triggers for verified attendance records.

---

## 15. Support and Dispute Requirements
*Status: Proposed New Implementation*
- **FR-15.1 [Proposed]:** Dispute Ticketing System:
  - Employer vs Employee: Disputed hours, no-show allegations, damaged equipment.
  - Customer vs Employer: Catering quality complaints, guest count discrepancy.
- **FR-15.2 [Proposed]:** Admin Dispute Arbitration: Admin reviews logged check-in/out timestamps, photo proofs (`event_tasks.photo_url`), and event chat messages (`messages`) to make final binding financial rulings.

---

## 16. Notification Requirements
- **FR-16.1 [Implemented]:** System notifications dispatch mechanism (`Notification` table + `core/notify.py`).
- **FR-16.2 [Proposed]:** Broadcast Platform Announcements: Admin can broadcast urgent alerts to all Employers, all Employees, or all users (e.g. scheduled maintenance, regulatory notices).
- **FR-16.3 [Proposed]:** Automated administrative alerts for high-risk events (e.g. 3 consecutive employer rejections, repeated employee no-shows).

---

## 17. Platform Settings Requirements
*Status: Proposed New Implementation*
- **FR-17.1 [Proposed]:** Global Key-Value Platform Settings table (`platform_settings`), decoupled from tenant-specific `settings`.
- **FR-17.2 [Proposed]:** Configurable parameters:
  - Default Currency (`INR`).
  - Standard GST percentage (5% catering, 18% workforce).
  - Platform Commission defaults.
  - Workforce shift cancellation penalty window.
  - Maintenance Mode toggle (instantly returns 503 Service Unavailable to non-admins).

---

## 18. Audit Log Requirements
- **FR-18.1 [Implemented]:** Centralized `audit_logs` table tracking `actor_user_id`, `company_id`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `created_at`.
- **FR-18.2 [Implemented]:** Admin inspection endpoint `GET /api/admin/audit-logs` and UI table `/admin/audit-logs`.
- **FR-18.3 [Proposed]:** Client IP address and User-Agent capture via FastAPI middleware.
- **FR-18.4 [Proposed]:** Searchable filters: Filter audit logs by Actor, Action Type, Entity Type, Date Range, and Keyword.

---

## 19. Security Requirements
- **SR-01 [Mandatory Fix]:** CORS Restructuring: Remove wildcard `*` from `allow_origins` when `allow_credentials=True`. Enforce strict explicit whitelist via environment variable.
- **SR-02 [Mandatory Fix]:** Rate Limiting: Apply strict rate limiting on `/api/auth/admin/login` (max 5 failed attempts per 15 minutes) and `/api/admin/*` APIs.
- **SR-03 [Mandatory Fix]:** Token Expiration & Rotation: Transition from static 7-day tokens to short-lived 15-minute access tokens paired with secure HTTP-only refresh tokens.
- **SR-04 [Data Precision]:** Financial Decimal Enforcement: Migrate all financial amount columns in PostgreSQL and SQLAlchemy from `Float` to `Numeric(12, 2)`.

---

## 20. Data Access Restrictions
- Admins possess system-wide read access for audit and governance.
- Admins must **NOT** have plaintext access to user passwords (enforced via bcrypt).
- Financial payout destination details (bank account numbers, IFSC codes) must be masked (e.g. `XXXXXX1234`) in the Admin UI.

---

## 21. Business Rules
1. **BR-01 (Approval Gate):** An Employer business in `pending_approval` or `rejected` state cannot create events, send quotations, generate invoices, or publish job postings.
2. **BR-02 (Suspension Immediacy):** When an account is marked `suspended`, all subsequent API calls using that user's identity must immediately fail with HTTP 403 Forbidden.
3. **BR-03 (Immutability of Audit Trails):** Audit log entries cannot be modified or deleted by any user, including Admins.
4. **BR-04 (Commission Deduction Order):** Platform commissions must be calculated on Gross Item Subtotals prior to GST application, avoiding tax-on-tax compounding.
5. **BR-05 (Rejection Justification):** An Admin cannot reject an Employer registration without providing a documented rejection reason of at least 15 characters.

---

## 22. Non-Functional Requirements
- **Performance:** Admin platform dashboard aggregation (`/api/admin/stats`) must respond in `< 300ms` under a 50,000-event database volume using indexed counts.
- **Scalability:** The Admin module must support horizontal scaling with stateless JWT / Redis session verification.
- **Reliability:** 99.9% uptime for core authentication and administrative monitoring routes.
- **Maintainability:** Full adherence to Pydantic v2 `ConfigDict` and SQLAlchemy 2.0 type conventions.

---

## 23. Error Handling Requirements
- Standardized RFC 7807 problem details or clean `{ "detail": "Human-readable message" }` JSON structures.
- HTTP 401 Unauthorized for invalid/expired admin tokens.
- HTTP 403 Forbidden for non-admin accounts attempting admin access.
- HTTP 404 Not Found for non-existent companies, employees, or events (preventing identifier leaking).
- HTTP 409 Conflict for duplicate business slugs, emails, or duplicate approval status transitions.

---

## 24. Acceptance Criteria
- [ ] Admin login accepts seeded credentials (`admin@plated.com`) and rejects non-admin users.
- [ ] Admin dashboard displays live KPI counts matching PostgreSQL records.
- [ ] Clicking "Approve" on a pending employer successfully executes `PATCH /api/admin/employers/{id}/approval`, updates status to `approved`, stamps `approved_by` and `approved_at`, logs to `audit_logs`, and immediately unlocks employer portal access.
- [ ] Clicking "Reject" requires a reason, updates status to `rejected`, and keeps employer portal access blocked.
- [ ] Admin Workforce view displays verified employee names, skills, and status without UI runtime errors.
- [ ] Suspending an employee or employer immediately prevents further logins and API execution.
- [ ] Every administrative status change is recorded in `audit_logs` with before and after state snapshots.

---

## 25. Dependencies on Other Platform Modules
- `app.models.models`: Dependent on `User`, `Company`, `EmployeeProfile`, `Event`, `Payment`, `AuditLog`.
- `app.core.security`: Dependent on `require_admin` and JWT token validator.
- `app.core.audit`: Dependent on `log_action` utility.
- Frontend API Client (`api/client.js`): Admin API depends on consistent authorization header injection.

---

## 26. Out-of-Scope Functionality (Phase 1 Admin)
- Direct real-time bank wire integration (NEFT/RTGS gateway triggers) — handled via simulated or manual reference logging in Phase 1.
- AI-based automatic menu generation or price recommendation algorithms.
- Custom mobile app for Admins (Admin portal is responsive web desktop/tablet first).

---

## 27. Open Decisions and Unresolved Questions
1. **Decision on Customer Role:** Should external customers be granted authenticated platform logins with a dedicated `/customer` portal (restoring a 4-role architecture), or should they permanently remain unauthenticated contacts managed exclusively by employers via magic payment/quote links?
2. **SaaS Billing Gateway Selection:** Will SaaS subscriptions be billed via Stripe Billing, Razorpay Subscriptions, or manual invoice generation?
3. **Commission Settlement Timing:** Are marketplace commissions deducted in real-time at the time of customer payment, or settled monthly against employer payouts?

