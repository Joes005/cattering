# PLATED Admin Module – Technical Architecture & Engineering Specification

## Document Metadata
- **Document Identifier:** `PLATED-ARCH-ADMIN-02`
- **Version:** `1.0.0`
- **Status:** Approved Architecture
- **Date:** November 22, 2026
- **Architecture Paradigm:** Modular Monolith with Domain-Driven Services
- **Platform Roles Supported:** Admin, Employer, Employee, Customer (Strict 4-Role Model)

---

## 1. Architectural Overview & System Topology

The PLATED platform operates as an enterprise-grade Modular Monolith. The **Admin Module** serves as the central platform control plane, governing multi-tenant business operations, workforce marketplace hiring, SaaS subscriptions, marketplace commissions, and platform disputes.

```mermaid
graph TD
    subgraph Client Layer [Admin SPA - React 18 + Vite + Tailwind]
        ADash[Admin Dashboard]
        AUsers[User & Identity Mgmt]
        ABiz[Business & KYC Verification]
        AEmp[Workforce & Staff Oversight]
        ASub[SaaS Subscription Control]
        AComm[Marketplace Commission Engine]
        AFin[Transactions & Settlements]
        ADisp[Dispute Resolution Center]
        ASet[Platform Settings & Governance]
        AAudit[Tamper-Evident Audit Viewer]
    end

    subgraph API Gateway & Security Layer [FastAPI]
        CORSMid[Strict CORS Whitelist]
        RateLim[Rate Limiting - SlowAPI / Redis]
        AuthMid[JWT Authenticator + Refresh Tokens]
        RBACMid[require_admin RBAC Guard]
    end

    subgraph Admin Service Layer [Python 3.12 / FastAPI]
        S_Stats[Platform Analytics Service]
        S_User[User Management Service]
        S_Biz[Business Verification Service]
        S_Emp[Workforce Oversight Service]
        S_Sub[Subscription Management Service]
        S_Comm[Commission Engine Service]
        S_Fin[Financial & Settlement Service]
        S_Disp[Dispute Arbitration Service]
        S_Set[Platform Settings Service]
        S_Audit[Audit Logging Service]
    end

    subgraph Data Access Layer [SQLAlchemy 2.0 ORM + Alembic]
        M_User[(users)]
        M_Biz[(companies / business_members)]
        M_Profile[(employee_profiles / customer_profiles)]
        M_Sub[(subscription_plans / subscriptions)]
        M_Comm[(commission_rules / commission_ledger)]
        M_Txn[(transactions / settlements)]
        M_Disp[(disputes / dispute_messages)]
        M_Set[(platform_settings)]
        M_Audit[(audit_logs)]
    end

    Client Layer -->|HTTP / JSON with Bearer JWT| API Gateway & Security Layer
    API Gateway & Security Layer --> Admin Service Layer
    Admin Service Layer --> Data Access Layer
```

---

## 2. Database Architecture & Schema Extensions

To support the complete Hybrid SaaS + Marketplace model with 4 distinct platform roles, the database is extended via Alembic migrations.

### 2.1 Enums & Types
```sql
-- Updated 4-Role Enum
CREATE TYPE userrole AS ENUM ('admin', 'employer', 'employee', 'customer');
CREATE TYPE userstatus AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE companystatus AS ENUM ('pending_approval', 'approved', 'rejected', 'suspended');

-- Subscription Enums
CREATE TYPE subscriptionbillingcycle AS ENUM ('monthly', 'annual');
CREATE TYPE subscriptionstatus AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');

-- Commission & Financial Enums
CREATE TYPE commissiontype AS ENUM ('catering_booking', 'workforce_shift');
CREATE TYPE commissioncalculationmode AS ENUM ('percentage', 'flat');
CREATE TYPE transactiontype AS ENUM ('customer_payment', 'subscription_fee', 'workforce_payout', 'commission_deduction', 'refund');
CREATE TYPE transactionstatus AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

-- Dispute Enums
CREATE TYPE disputestatus AS ENUM ('open', 'under_review', 'resolved', 'dismissed');
CREATE TYPE disputeparty AS ENUM ('customer_employer', 'employer_employee', 'customer_platform', 'employer_platform');
```

### 2.2 Table Specifications

#### A. Identity & Customer Profiles
```sql
-- Customer Profile table for role = 'customer'
CREATE TABLE customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    default_address TEXT,
    city VARCHAR(100) NOT NULL DEFAULT 'Chennai',
    preferred_cuisine VARCHAR(100)[],
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_customer_profiles_user ON customer_profiles(user_id);
```

#### B. SaaS Subscriptions
```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,       -- 'starter', 'growth', 'business'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    monthly_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    annual_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    max_active_events_per_month INT NOT NULL DEFAULT 5,
    max_customers INT NOT NULL DEFAULT 50,
    max_job_postings_per_month INT NOT NULL DEFAULT 10,
    custom_branding BOOLEAN NOT NULL DEFAULT FALSE,
    analytics_tier VARCHAR(30) NOT NULL DEFAULT 'basic', -- 'basic', 'advanced', 'custom'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    billing_cycle subscriptionbillingcycle NOT NULL DEFAULT 'monthly',
    status subscriptionstatus NOT NULL DEFAULT 'trialing',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    payment_reference VARCHAR(150),
    auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

#### C. Marketplace Commission Engine
```sql
CREATE TABLE commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_type commissiontype NOT NULL, -- 'catering_booking' or 'workforce_shift'
    name VARCHAR(100) NOT NULL,
    calculation_mode commissioncalculationmode NOT NULL DEFAULT 'percentage',
    rate NUMERIC(6, 2) NOT NULL DEFAULT 5.00, -- e.g. 10.00%
    flat_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL means global default
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE commission_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES commission_rules(id) ON DELETE SET NULL,
    commission_type commissiontype NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES employee_assignments(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employee_profiles(id) ON DELETE SET NULL,
    gross_amount NUMERIC(12, 2) NOT NULL,
    commission_rate NUMERIC(6, 2) NOT NULL,
    commission_amount NUMERIC(12, 2) NOT NULL,
    net_payout NUMERIC(12, 2) NOT NULL,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_commission_ledger_company ON commission_ledger(company_id);
CREATE INDEX idx_commission_ledger_type ON commission_ledger(commission_type);
```

#### D. Consolidated Financial Transactions
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(50) NOT NULL UNIQUE,
    transaction_type transactiontype NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    gateway_provider VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'razorpay', 'stripe', 'manual'
    gateway_reference VARCHAR(150),
    status transactionstatus NOT NULL DEFAULT 'completed',
    payment_method VARCHAR(50), -- 'upi', 'credit_card', 'net_banking', 'cash'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_transactions_type_status ON transactions(transaction_type, status);
CREATE INDEX idx_transactions_company ON transactions(company_id);
```

#### E. Support & Dispute Arbitration
```sql
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_number VARCHAR(40) NOT NULL UNIQUE,
    party_type disputeparty NOT NULL,
    opened_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES employee_assignments(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    claim_amount NUMERIC(12, 2) DEFAULT 0.00,
    status disputestatus NOT NULL DEFAULT 'open',
    resolution_summary TEXT,
    arbitrated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    attachment_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### F. Platform Configuration Settings
```sql
CREATE TABLE platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(80) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general', -- 'general', 'billing', 'commission', 'security'
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. REST API Design & Contracts

All Admin endpoints require `Authorization: Bearer <token>` and are guarded by `require_admin`.

### 3.1 Overview & Analytics
- `GET /api/admin/stats` -> Returns platform KPIs, revenue breakdown, and growth metrics.
- `GET /api/admin/charts/revenue` -> Monthly revenue timeseries (SaaS vs Commission).
- `GET /api/admin/charts/events` -> Event volume & status distribution.

### 3.2 User & Workforce Governance
- `GET /api/admin/users` -> Filterable user directory (`role`, `status`, `search`).
- `PATCH /api/admin/users/{user_id}/status` -> Suspend / activate any user.
- `GET /api/admin/employees` -> Workforce roster with skills, rating, shift completion metrics.
- `PATCH /api/admin/employees/{user_id}/verification` -> Verify national ID & skills.

### 3.3 Business & KYC Verification
- `GET /api/admin/employers` -> Catering business directory with status filter.
- `GET /api/admin/employers/{company_id}` -> Complete business dossier with owner details.
- `PATCH /api/admin/employers/{company_id}/approval` -> Approve or reject registration with reason.
- `PATCH /api/admin/employers/{company_id}/status` -> Suspend or activate business.

### 3.4 SaaS Subscription Management
- `GET /api/admin/subscriptions/plans` -> List all subscription tiers.
- `POST /api/admin/subscriptions/plans` -> Create new subscription tier.
- `PATCH /api/admin/subscriptions/plans/{plan_id}` -> Update tier price and limits.
- `GET /api/admin/subscriptions` -> List active employer subscriptions with filter.
- `POST /api/admin/subscriptions/override` -> Manually assign/extend subscription for a company.

### 3.5 Marketplace Commission Management
- `GET /api/admin/commissions/rules` -> List global and company-specific commission rules.
- `POST /api/admin/commissions/rules` -> Create/update commission rule.
- `GET /api/admin/commissions/ledger` -> Ledger of all deducted platform commissions.
- `POST /api/admin/commissions/settle/{ledger_id}` -> Mark commission item as settled.

### 3.6 Financial Transactions & Settlements
- `GET /api/admin/transactions` -> Unified transaction ledger (filter by type, status, date).
- `POST /api/admin/transactions/{transaction_id}/refund` -> Process refund on transaction.

### 3.7 Dispute Resolution
- `GET /api/admin/disputes` -> List disputes (`open`, `under_review`, `resolved`).
- `GET /api/admin/disputes/{dispute_id}` -> Full dispute thread with messages and evidence.
- `POST /api/admin/disputes/{dispute_id}/messages` -> Post official admin message to dispute.
- `PATCH /api/admin/disputes/{dispute_id}/resolve` -> Submit binding dispute resolution.

### 3.8 Platform Settings & Governance
- `GET /api/admin/settings` -> List platform global settings.
- `PATCH /api/admin/settings/{key}` -> Update platform parameter value.
- `GET /api/admin/audit-logs` -> Filterable tamper-evident activity log.

---

## 4. Frontend Architecture (Admin Portal)

The Admin Portal is housed in `frontend/src/app/AdminPortal.jsx` with routes under `/admin/*`:

```
/admin                    -> Dashboard (KPIs, revenue breakdown, pending approvals)
/admin/companies          -> Catering Businesses (KYC review, approvals, suspension)
/admin/users              -> Platform Users (all roles: Admin, Employer, Employee, Customer)
/admin/employees          -> Workforce Roster (skills, hourly rates, attendance records)
/admin/subscriptions      -> SaaS Subscriptions (plans builder, active employer billing)
/admin/commissions        -> Marketplace Commissions (rules engine & ledger reconciliation)
/admin/transactions       -> Platform Financial Ledger & Refunds
/admin/disputes           -> Dispute Arbitration Center
/admin/settings           -> Global Platform Settings
/admin/audit-logs         -> System Security & Activity Trail
```

---

## 5. Security & Isolation Controls
1. **Strict CORS Whitelist:** Replaces `allow_origins=["*"]` with an explicit environment domain whitelist.
2. **Rate Limiting:** Protects `/api/auth/admin/login` and mutation endpoints against brute force.
3. **Session Revocation:** Redis/Database blacklist for immediate JWT revocation upon admin suspension.
4. **Data Isolation:** Admin has read/governance access, but sensitive private credentials (passwords, bank details) are strictly masked.

