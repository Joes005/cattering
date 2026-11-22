import sys
from sqlalchemy import text
from app.db.database import engine

def run_migration():
    print("Starting database schema migration to 3-role architecture...")
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Handle Enum Type Updates by temporarily casting to VARCHAR
            print("1. Updating Enum types...")
            
            # companystatus
            conn.execute(text("ALTER TABLE companies ALTER COLUMN status DROP DEFAULT;"))
            conn.execute(text("ALTER TABLE companies ALTER COLUMN status TYPE VARCHAR(50);"))
            conn.execute(text("DROP TYPE IF EXISTS companystatus CASCADE;"))
            conn.execute(text("CREATE TYPE companystatus AS ENUM ('pending_approval', 'approved', 'rejected', 'suspended');"))
            conn.execute(text("""
                UPDATE companies SET status = CASE 
                    WHEN status = 'active' THEN 'approved'
                    WHEN status = 'inactive' THEN 'suspended'
                    ELSE 'approved'
                END;
            """))
            conn.execute(text("ALTER TABLE companies ALTER COLUMN status TYPE companystatus USING status::companystatus;"))
            conn.execute(text("ALTER TABLE companies ALTER COLUMN status SET DEFAULT 'pending_approval'::companystatus;"))

            # userrole
            conn.execute(text("DROP TYPE IF EXISTS userrole CASCADE;"))
            conn.execute(text("CREATE TYPE userrole AS ENUM ('admin', 'employer', 'employee');"))

            # userstatus
            cols_users = [r[0] for r in conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users';"
            )).fetchall()]
            if 'status' in cols_users:
                conn.execute(text("ALTER TABLE users ALTER COLUMN status DROP DEFAULT;"))
                conn.execute(text("ALTER TABLE users ALTER COLUMN status TYPE VARCHAR(50);"))
                conn.execute(text("DROP TYPE IF EXISTS userstatus CASCADE;"))
                conn.execute(text("CREATE TYPE userstatus AS ENUM ('active', 'suspended', 'pending');"))
                conn.execute(text("ALTER TABLE users ALTER COLUMN status TYPE userstatus USING status::userstatus;"))
                conn.execute(text("ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active'::userstatus;"))

            # jobpostingstatus, applicationstatus, assignmentstatus, attendancestatus, payoutstatus
            conn.execute(text("DROP TYPE IF EXISTS jobpostingstatus CASCADE;"))
            conn.execute(text("CREATE TYPE jobpostingstatus AS ENUM ('open', 'filled', 'cancelled', 'completed');"))
            
            conn.execute(text("DROP TYPE IF EXISTS applicationstatus CASCADE;"))
            conn.execute(text("CREATE TYPE applicationstatus AS ENUM ('applied', 'shortlisted', 'accepted', 'rejected', 'withdrawn');"))
            
            conn.execute(text("DROP TYPE IF EXISTS assignmentstatus CASCADE;"))
            conn.execute(text("CREATE TYPE assignmentstatus AS ENUM ('confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');"))
            
            conn.execute(text("DROP TYPE IF EXISTS attendancestatus CASCADE;"))
            conn.execute(text("CREATE TYPE attendancestatus AS ENUM ('present', 'late', 'absent', 'half_day');"))
            
            conn.execute(text("DROP TYPE IF EXISTS payoutstatus CASCADE;"))
            conn.execute(text("CREATE TYPE payoutstatus AS ENUM ('pending', 'approved', 'paid', 'disputed');"))

            # 2. Customers table
            print("2. Ensuring customers table exists and is populated...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS customers (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    name VARCHAR(120) NOT NULL,
                    email VARCHAR(160),
                    phone VARCHAR(30) NOT NULL,
                    address TEXT,
                    notes TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    deleted_at TIMESTAMPTZ
                );
            """))

            has_clients = conn.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients');"
            )).scalar()
            if has_clients:
                conn.execute(text("""
                    INSERT INTO customers (id, company_id, name, email, phone, notes, created_at, deleted_at)
                    SELECT id, company_id, name, email, COALESCE(phone, '0000000000'), notes, created_at, deleted_at
                    FROM clients
                    ON CONFLICT (id) DO NOTHING;
                """))

            # 3. Update events table
            print("3. Updating events table...")
            cols_events = [r[0] for r in conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'events';"
            )).fetchall()]
            if 'client_id' in cols_events and 'customer_id' not in cols_events:
                conn.execute(text("ALTER TABLE events ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT;"))
                conn.execute(text("UPDATE events SET customer_id = client_id;"))
                conn.execute(text("ALTER TABLE events ALTER COLUMN customer_id SET NOT NULL;"))
                conn.execute(text("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_client_id_fkey;"))
                conn.execute(text("ALTER TABLE events DROP COLUMN client_id;"))

            # Map event_tasks assigned_to before dropping company_members
            has_cm = conn.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'company_members');"
            )).scalar()
            cols_tasks = [r[0] for r in conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'event_tasks';"
            )).fetchall()]
            if 'assigned_to' in cols_tasks and has_cm:
                print("Mapping event_tasks.assigned_to to users.id...")
                conn.execute(text("ALTER TABLE event_tasks DROP CONSTRAINT IF EXISTS event_tasks_assigned_to_fkey;"))
                conn.execute(text("""
                    UPDATE event_tasks et
                    SET assigned_to = cm.user_id
                    FROM company_members cm
                    WHERE et.assigned_to = cm.id;
                """))
                conn.execute(text("ALTER TABLE event_tasks RENAME COLUMN assigned_to TO assigned_to_user_id;"))

            # 4. Update users table with role
            print("4. Updating users.role...")
            if 'role' not in cols_users:
                conn.execute(text("ALTER TABLE users ADD COLUMN role userrole;"))
                
                conn.execute(text("UPDATE users SET role = 'admin' WHERE global_role = 'admin';"))
                
                if has_cm:
                    conn.execute(text("""
                        UPDATE users SET role = 'employer'
                        WHERE id IN (SELECT user_id FROM company_members WHERE employment_role = 'owner');
                    """))
                    conn.execute(text("""
                        UPDATE users SET role = 'employee'
                        WHERE id IN (SELECT user_id FROM company_members WHERE employment_role IN ('manager', 'staff'));
                    """))
                
                conn.execute(text("UPDATE users SET role = 'employer' WHERE role IS NULL AND global_role = 'company_user';"))
                conn.execute(text("UPDATE users SET role = 'employee' WHERE role IS NULL;"))
                conn.execute(text("ALTER TABLE users ALTER COLUMN role SET NOT NULL;"))
                conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS global_role;"))

            # 5. Companies columns
            print("5. Updating companies columns...")
            cols_companies = [r[0] for r in conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'companies';"
            )).fetchall()]
            if 'owner_id' not in cols_companies:
                conn.execute(text("ALTER TABLE companies ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE RESTRICT;"))
                if has_cm:
                    conn.execute(text("""
                        UPDATE companies c
                        SET owner_id = cm.user_id
                        FROM company_members cm
                        WHERE cm.company_id = c.id AND cm.employment_role = 'owner';
                    """))
                conn.execute(text("""
                    UPDATE companies
                    SET owner_id = (SELECT id FROM users WHERE role = 'employer' LIMIT 1)
                    WHERE owner_id IS NULL;
                """))
                conn.execute(text("ALTER TABLE companies ALTER COLUMN owner_id SET NOT NULL;"))

            if 'business_type' not in cols_companies:
                conn.execute(text("ALTER TABLE companies ADD COLUMN business_type VARCHAR(100) DEFAULT 'Catering Service';"))
            if 'business_address' not in cols_companies:
                conn.execute(text("ALTER TABLE companies ADD COLUMN business_address TEXT;"))
            if 'description' not in cols_companies:
                conn.execute(text("ALTER TABLE companies ADD COLUMN description TEXT;"))
            if 'rejection_reason' not in cols_companies:
                conn.execute(text("ALTER TABLE companies ADD COLUMN rejection_reason TEXT;"))
            if 'approved_at' not in cols_companies:
                conn.execute(text("ALTER TABLE companies ADD COLUMN approved_at TIMESTAMPTZ;"))
            if 'approved_by' not in cols_companies:
                conn.execute(text("ALTER TABLE companies ADD COLUMN approved_by UUID REFERENCES users(id) ON DELETE SET NULL;"))
            if 'updated_at' not in cols_companies:
                conn.execute(text("ALTER TABLE companies ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;"))

            # 6. Employee Profiles
            print("6. Creating employee_profiles table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS employee_profiles (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    date_of_birth DATE,
                    gender VARCHAR(30),
                    location VARCHAR(150) NOT NULL DEFAULT 'Chennai, Tamil Nadu',
                    skills VARCHAR(100)[] DEFAULT '{}',
                    work_experience_years FLOAT DEFAULT 0.0,
                    preferred_work_type VARCHAR(50) DEFAULT 'flexible',
                    availability_status VARCHAR(50) DEFAULT 'available',
                    preferred_days VARCHAR(50)[] DEFAULT '{}',
                    bio TEXT,
                    rating FLOAT DEFAULT 5.0,
                    total_completed_events INT DEFAULT 0,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))

            conn.execute(text("""
                INSERT INTO employee_profiles (user_id, location, skills, bio)
                SELECT id, 'Chennai, Tamil Nadu', ARRAY['Server', 'Hospitality'], 'Experienced catering team member'
                FROM users
                WHERE role = 'employee'
                AND id NOT IN (SELECT user_id FROM employee_profiles);
            """))

            # 7. Job Postings
            print("7. Creating job_postings table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS job_postings (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                    role_title VARCHAR(100) NOT NULL,
                    description TEXT,
                    required_count INT NOT NULL DEFAULT 1,
                    filled_count INT NOT NULL DEFAULT 0,
                    shift_start TIMESTAMPTZ NOT NULL,
                    shift_end TIMESTAMPTZ NOT NULL,
                    pay_rate FLOAT NOT NULL,
                    pay_type VARCHAR(30) DEFAULT 'fixed_shift',
                    location VARCHAR(200) NOT NULL,
                    status jobpostingstatus NOT NULL DEFAULT 'open',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))

            # 8. Job Applications
            print("8. Creating job_applications table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS job_applications (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
                    employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
                    cover_note TEXT,
                    status applicationstatus NOT NULL DEFAULT 'applied',
                    employer_notes TEXT,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    reviewed_at TIMESTAMPTZ,
                    CONSTRAINT uq_job_application UNIQUE (job_posting_id, employee_id)
                );
            """))

            # 9. Employee Assignments
            print("9. Creating employee_assignments table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS employee_assignments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                    job_posting_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
                    employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE RESTRICT,
                    event_role VARCHAR(100) NOT NULL,
                    shift_start TIMESTAMPTZ NOT NULL,
                    shift_end TIMESTAMPTZ NOT NULL,
                    agreed_pay FLOAT NOT NULL DEFAULT 0.0,
                    status assignmentstatus NOT NULL DEFAULT 'confirmed',
                    notes TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_event_employee_assignment UNIQUE (event_id, employee_id)
                );
            """))

            # 10. Attendance
            print("10. Creating attendance table...")
            conn.execute(text("DROP TABLE IF EXISTS attendance CASCADE;"))
            conn.execute(text("""
                CREATE TABLE attendance (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    assignment_id UUID NOT NULL UNIQUE REFERENCES employee_assignments(id) ON DELETE CASCADE,
                    check_in TIMESTAMPTZ,
                    check_out TIMESTAMPTZ,
                    hours_worked FLOAT DEFAULT 0.0,
                    status attendancestatus NOT NULL DEFAULT 'present',
                    verified_by_employer BOOLEAN DEFAULT FALSE,
                    notes TEXT
                );
            """))

            # 11. Employee Earnings
            print("11. Creating employee_earnings table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS employee_earnings (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    assignment_id UUID NOT NULL UNIQUE REFERENCES employee_assignments(id) ON DELETE RESTRICT,
                    employee_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE RESTRICT,
                    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
                    amount FLOAT NOT NULL DEFAULT 0.0,
                    status payoutstatus NOT NULL DEFAULT 'pending',
                    payment_reference VARCHAR(100),
                    paid_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """))

            # 12. Drop legacy tables safely
            print("12. Dropping legacy tables...")
            conn.execute(text("DROP TABLE IF EXISTS member_permission_overrides CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS role_permissions CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS permissions CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS event_staff CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS company_members CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS clients CASCADE;"))
            conn.execute(text("DROP TABLE IF EXISTS subscriptions CASCADE;"))

            # Reconnect event_tasks assigned_to_user_id FK to users
            # Clean up any invalid assigned_to_user_id
            conn.execute(text("""
                UPDATE event_tasks 
                SET assigned_to_user_id = NULL 
                WHERE assigned_to_user_id NOT IN (SELECT id FROM users);
            """))
            conn.execute(text("""
                ALTER TABLE event_tasks 
                ADD CONSTRAINT event_tasks_assigned_to_fkey 
                FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL;
            """))

            # Clean up obsolete enums
            conn.execute(text("DROP TYPE IF EXISTS employmentrole CASCADE;"))
            conn.execute(text("DROP TYPE IF EXISTS globalrole CASCADE;"))
            conn.execute(text("DROP TYPE IF EXISTS memberstatus CASCADE;"))
            conn.execute(text("DROP TYPE IF EXISTS permissioneffect CASCADE;"))
            conn.execute(text("DROP TYPE IF EXISTS eventstaffrole CASCADE;"))

            trans.commit()
            print("✅ Database migration completed successfully!")
        except Exception as e:
            trans.rollback()
            print(f"❌ Error during migration: {e}")
            raise

if __name__ == "__main__":
    run_migration()
