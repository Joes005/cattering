# PLATED – Employer Role Architecture Specification
**Document Version:** 1.0.0  
**Status:** Implemented & Verified  
**Target Platform:** PLATED (Hybrid SaaS + Marketplace)

---

## 1. Architectural Overview

The **Employer** represents catering business owners operating on the PLATED platform. Under the Master Vision, an employer has two fundamental roles:
1. **SaaS Tenant:** Full management of their catering businesses, including bookings, events, customer CRM, menus, packages, quotations, invoices, payments, and inventory.
2. **Workforce Marketplace Participant:** Discovering, hiring, scheduling, verifying attendance, and approving payouts for independent part-time catering professionals (waiters, chefs, bartenders, event runners).

### Multi-Business Ownership Architecture
A single Employer account (`users.role = 'employer'`) can own and operate multiple catering businesses (`companies` table).
- `companies.owner_id` is an FK to `users.id`.
- Tenant data isolation is strictly scoped by `company_id` across events, customers, quotations, invoices, payments, inventory, and shift postings.
- The employer can dynamically switch between businesses using the Topbar Business Switcher without logging out.

---

## 2. Security & Tenant Scoping Model

### Authorization Scope (`ensure_company_scope`)
Every route operating on company resources enforces tenant scoping:
```python
def ensure_company_scope(user: User, company_id_of_resource: str, current_company: Optional[Company] = None):
    if user.role == UserRole.admin:
        return
    if user.role == UserRole.employer:
        owned_ids = [c.id for c in getattr(user, "companies", [])]
        if current_company and current_company.id not in owned_ids:
            owned_ids.append(current_company.id)
        if company_id_of_resource not in owned_ids:
            raise HTTPException(status_code=403, detail="Access denied to this catering business")
        return
```

---

## 3. Employer API Specifications

### Business Lifecycle & Multi-Business APIs
- `GET /api/companies/my-businesses`: Lists all catering businesses owned by the authenticated employer.
- `POST /api/companies`: Registers an additional catering business under the existing employer account.
- `GET /api/companies/{id}`: Retrieves business profile, GST details, currency, and verification status.
- `PATCH /api/companies/{id}`: Updates catering business operational settings.

### SaaS Subscription APIs
- `GET /api/companies/{id}/subscription`: Returns current plan tier, status (`active`, `trialing`, `canceled`), current period end, and operational resource meters (events used, customer contacts used, job postings used against tier limits).
- `POST /api/companies/{id}/subscription/subscribe`: Self-serve checkout and tier upgrades (`starter`, `growth`, `business`) with monthly or annual billing cycle.

### Catering SaaS Operations
- `GET/POST /api/companies/{id}/customers`: Customer CRM contact management.
- `GET/POST /api/companies/{id}/events`: Event booking lifecycle (inquiry → quoted → confirmed → in_progress → completed → cancelled).
- `GET/POST /api/companies/{id}/events/{event_id}/quotations`: Quotation generation with itemized packages, taxes, discounts, delivery charges.
- `GET/POST /api/companies/{id}/events/{event_id}/invoices`: Invoicing with automated balance calculation and payment tracking.
- `GET/POST /api/companies/{id}/menus`: Menu categories and dishes.
- `GET/POST /api/companies/{id}/inventory`: Inventory tracking, stock levels, and purchasing transactions.

### Workforce Marketplace Operations
- `GET/POST /api/marketplace/jobs`: Create shift postings tied to an event.
- `GET /api/marketplace/jobs/{job_id}/applications`: Review applicant profiles, experience, and hourly rates.
- `PATCH /api/marketplace/applications/{app_id}`: Accept or decline applicant.
- `POST /api/marketplace/attendance/{att_id}/verify`: Verify worker attendance and clock-in/out hours.
- `PATCH /api/marketplace/payouts/{earning_id}/status`: Approve worker payouts.

---

## 4. Frontend Architecture & Multi-Tenant State

1. **`AuthContext.jsx`:**
   - Holds `companies` list and `currentCompanyId` (persisted in `localStorage`).
   - Dynamically resolves `company` (active catering business).
   - Exposes `registerAdditionalBusiness(payload)` and `setCurrentCompanyId(id)`.
2. **`Topbar.jsx` Multi-Business Switcher:**
   - Displays active business name and verification badge (`Approved` vs `Pending Approval`).
   - One-click switcher menu across all owned companies.
   - "+ Register Another Business" modal for instant branch creation.
3. **`CompanyPortal.jsx` & Navigation:**
   - Full sidebar: Dashboard, Events, Customers, Workforce Marketplace, Menus & Packages, Inventory, Reports, SaaS Subscription, Settings.
4. **`Subscription.jsx`:**
   - Displays current plan, renewal date, resource usage bars (Events, Customers, Job Postings).
   - Plan comparison cards for Starter, Growth, and Business with monthly/annual toggle and 1-click self-serve upgrade.

---

## 5. Verification & Test Coverage

Automated test suite: `backend/tests/test_employer_multi_business_and_subscription.py`
- ✅ Employer registration and initial catering company creation.
- ✅ Token and auth/me payloads returning complete `companies` list.
- ✅ Registering a 2nd catering business under the same account.
- ✅ Multi-business listing verification via `GET /api/companies/my-businesses`.
- ✅ Strict multi-tenant data isolation: events in Company 1 are isolated from Company 2.
- ✅ Admin review and approval integration.
- ✅ Querying SaaS subscription status and usage meters.
- ✅ Upgrading to Growth annual subscription and verifying limits.
- ✅ Security boundary verification preventing cross-employer tenant access.
- ✅ Frontend build passes with 0 compilation errors (`npm run build`).

