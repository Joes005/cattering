"""admin_full_module_schema

Revision ID: a2abe111a024
Revises: 6e11cdbd3b73
Create Date: 2026-11-22 16:36:11.706055

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a2abe111a024'
down_revision: Union[str, None] = '6e11cdbd3b73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Update userrole enum with 'customer'
    conn.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'customer';"))

    # 2. Create New Enum Types if not exists
    conn.execute(sa.text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscriptionbillingcycle') THEN
                CREATE TYPE subscriptionbillingcycle AS ENUM ('monthly', 'annual');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscriptionstatus') THEN
                CREATE TYPE subscriptionstatus AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commissiontype') THEN
                CREATE TYPE commissiontype AS ENUM ('catering_booking', 'workforce_shift');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commissioncalculationmode') THEN
                CREATE TYPE commissioncalculationmode AS ENUM ('percentage', 'flat');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transactiontype') THEN
                CREATE TYPE transactiontype AS ENUM ('customer_payment', 'subscription_fee', 'workforce_payout', 'commission_deduction', 'refund');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transactionstatus') THEN
                CREATE TYPE transactionstatus AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'disputestatus') THEN
                CREATE TYPE disputestatus AS ENUM ('open', 'under_review', 'resolved', 'dismissed');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'disputeparty') THEN
                CREATE TYPE disputeparty AS ENUM ('customer_employer', 'employer_employee', 'customer_platform', 'employer_platform');
            END IF;
        END
        $$;
    """))

    # 3. customer_profiles
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS customer_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            default_address TEXT,
            city VARCHAR(100) NOT NULL DEFAULT 'Chennai',
            preferred_cuisine VARCHAR(100)[] DEFAULT '{}',
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_customer_profiles_user ON customer_profiles(user_id);
    """))

    # 4. subscription_plans
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS subscription_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            monthly_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            annual_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            max_active_events_per_month INT NOT NULL DEFAULT 5,
            max_customers INT NOT NULL DEFAULT 50,
            max_job_postings_per_month INT NOT NULL DEFAULT 10,
            custom_branding BOOLEAN NOT NULL DEFAULT FALSE,
            analytics_tier VARCHAR(30) NOT NULL DEFAULT 'basic',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 5. subscriptions
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
            billing_cycle subscriptionbillingcycle NOT NULL DEFAULT 'monthly',
            status subscriptionstatus NOT NULL DEFAULT 'trialing',
            current_period_start TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            current_period_end TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
            trial_end TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '14 days'),
            cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
            payment_reference VARCHAR(150),
            auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    """))

    # 6. commission_rules
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS commission_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            commission_type commissiontype NOT NULL,
            name VARCHAR(100) NOT NULL,
            calculation_mode commissioncalculationmode NOT NULL DEFAULT 'percentage',
            rate NUMERIC(6, 2) NOT NULL DEFAULT 5.00,
            flat_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
            company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 7. commission_ledger
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS commission_ledger (
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
        CREATE INDEX IF NOT EXISTS idx_commission_ledger_company ON commission_ledger(company_id);
        CREATE INDEX IF NOT EXISTS idx_commission_ledger_type ON commission_ledger(commission_type);
    """))

    # 8. transactions
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            transaction_number VARCHAR(50) NOT NULL UNIQUE,
            transaction_type transactiontype NOT NULL,
            company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            event_id UUID REFERENCES events(id) ON DELETE SET NULL,
            amount NUMERIC(12, 2) NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'INR',
            gateway_provider VARCHAR(50) NOT NULL DEFAULT 'manual',
            gateway_reference VARCHAR(150),
            status transactionstatus NOT NULL DEFAULT 'completed',
            payment_method VARCHAR(50) DEFAULT 'upi',
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(transaction_type, status);
        CREATE INDEX IF NOT EXISTS idx_transactions_company ON transactions(company_id);
    """))

    # 9. disputes and dispute_messages
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS disputes (
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
        CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

        CREATE TABLE IF NOT EXISTS dispute_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
            sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            message TEXT NOT NULL,
            attachment_url VARCHAR(500),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 10. platform_settings
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS platform_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key VARCHAR(80) NOT NULL UNIQUE,
            value JSONB NOT NULL,
            description TEXT,
            category VARCHAR(50) NOT NULL DEFAULT 'general',
            updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """))

    # 11. Initial Seed Data for Plans, Rules, and Settings
    conn.execute(sa.text("""
        INSERT INTO subscription_plans (code, name, description, monthly_price, annual_price, max_active_events_per_month, max_customers, max_job_postings_per_month, custom_branding, analytics_tier)
        VALUES 
        ('free', 'Free Trial', 'Basic catering management for new businesses', 0.00, 0.00, 3, 20, 5, false, 'basic'),
        ('starter', 'Starter Caterer', 'Ideal for growing boutique caterers', 1499.00, 14990.00, 15, 100, 25, false, 'basic'),
        ('growth', 'Growth Operations', 'Full operational suite for active catering firms', 3999.00, 39990.00, 50, 500, 100, true, 'advanced'),
        ('business', 'Enterprise Caterer', 'Unlimited scale for high-volume caterers and multi-branch operations', 7999.00, 79990.00, 9999, 99999, 9999, true, 'custom')
        ON CONFLICT (code) DO NOTHING;

        INSERT INTO commission_rules (commission_type, name, calculation_mode, rate, flat_fee, is_active)
        VALUES 
        ('catering_booking', 'Platform Catering Booking Commission', 'percentage', 8.00, 0.00, true),
        ('workforce_shift', 'Workforce Shift Facilitation Fee', 'percentage', 10.00, 0.00, true)
        ON CONFLICT DO NOTHING;

        INSERT INTO platform_settings (key, value, description, category)
        VALUES 
        ('platform_name', '"PLATED"'::jsonb, 'Platform official brand name', 'general'),
        ('default_currency', '"INR"'::jsonb, 'Default financial currency code', 'billing'),
        ('catering_commission_rate', '8.0'::jsonb, 'Default percentage commission on catering bookings', 'commission'),
        ('workforce_commission_rate', '10.0'::jsonb, 'Default percentage commission on workforce shifts', 'commission'),
        ('gst_rate_catering', '5.0'::jsonb, 'Standard GST percentage for food catering', 'billing'),
        ('gst_rate_workforce', '18.0'::jsonb, 'Standard GST percentage for workforce agency services', 'billing'),
        ('maintenance_mode', 'false'::jsonb, 'Global system maintenance gate', 'security'),
        ('auto_approve_employers', 'false'::jsonb, 'Require manual admin review for new employers', 'security')
        ON CONFLICT (key) DO NOTHING;
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("""
        DROP TABLE IF EXISTS dispute_messages CASCADE;
        DROP TABLE IF EXISTS disputes CASCADE;
        DROP TABLE IF EXISTS transactions CASCADE;
        DROP TABLE IF EXISTS commission_ledger CASCADE;
        DROP TABLE IF EXISTS commission_rules CASCADE;
        DROP TABLE IF EXISTS subscriptions CASCADE;
        DROP TABLE IF EXISTS subscription_plans CASCADE;
        DROP TABLE IF EXISTS customer_profiles CASCADE;
        DROP TABLE IF EXISTS platform_settings CASCADE;
        DROP TYPE IF EXISTS disputeparty CASCADE;
        DROP TYPE IF EXISTS disputestatus CASCADE;
        DROP TYPE IF EXISTS transactionstatus CASCADE;
        DROP TYPE IF EXISTS transactiontype CASCADE;
        DROP TYPE IF EXISTS commissioncalculationmode CASCADE;
        DROP TYPE IF EXISTS commissiontype CASCADE;
        DROP TYPE IF EXISTS subscriptionstatus CASCADE;
        DROP TYPE IF EXISTS subscriptionbillingcycle CASCADE;
    """))
