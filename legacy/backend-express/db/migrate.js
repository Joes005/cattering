const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── USERS ────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(120) NOT NULL,
        email         VARCHAR(200) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role          VARCHAR(20)  NOT NULL CHECK (role IN ('seeker','employer','admin')),
        avatar_url    TEXT,
        location      VARCHAR(150),
        bio           TEXT,
        phone         VARCHAR(30),
        is_verified   BOOLEAN DEFAULT FALSE,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── SEEKER PROFILES ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS seeker_profiles (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        title           VARCHAR(120),
        years_exp       INTEGER DEFAULT 0,
        hourly_rate     NUMERIC(8,2),
        availability    VARCHAR(50),
        skills          TEXT[],
        certifications  TEXT[],
        resume_url      TEXT,
        avg_rating      NUMERIC(3,2) DEFAULT 0,
        review_count    INTEGER DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── EMPLOYER PROFILES ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS employer_profiles (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(200) NOT NULL,
        company_size VARCHAR(50),
        industry     VARCHAR(100),
        website      TEXT,
        logo_url     TEXT,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── CATEGORIES ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id        SERIAL PRIMARY KEY,
        name      VARCHAR(100) UNIQUE NOT NULL,
        icon      VARCHAR(10),
        job_count INTEGER DEFAULT 0
      );
    `);

    // ── JOBS ──────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employer_id     UUID REFERENCES users(id) ON DELETE CASCADE,
        category_id     INTEGER REFERENCES categories(id),
        title           VARCHAR(200) NOT NULL,
        company_name    VARCHAR(200) NOT NULL,
        location        VARCHAR(150) NOT NULL,
        description     TEXT NOT NULL,
        requirements    TEXT,
        job_type        VARCHAR(30) CHECK (job_type IN ('full-time','part-time','contract','gig','seasonal')),
        salary_min      NUMERIC(10,2),
        salary_max      NUMERIC(10,2),
        salary_type     VARCHAR(10) CHECK (salary_type IN ('hourly','yearly')),
        tags            TEXT[],
        badge           VARCHAR(20) CHECK (badge IN ('featured','urgent','new')),
        status          VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','closed','draft')),
        applicant_count INTEGER DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── APPLICATIONS ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id      UUID REFERENCES jobs(id) ON DELETE CASCADE,
        seeker_id   UUID REFERENCES users(id) ON DELETE CASCADE,
        cover_note  TEXT,
        status      VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','reviewed','accepted','rejected','withdrawn')),
        applied_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(job_id, seeker_id)
      );
    `);

    // ── REVIEWS ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id      UUID REFERENCES jobs(id) ON DELETE SET NULL,
        reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
        reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
        rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment     TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── PAYMENTS ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id            UUID REFERENCES jobs(id) ON DELETE SET NULL,
        payer_id          UUID REFERENCES users(id) ON DELETE SET NULL,
        amount_cents      INTEGER NOT NULL,
        currency          VARCHAR(3) DEFAULT 'usd',
        stripe_session_id TEXT,
        stripe_payment_id TEXT,
        status            VARCHAR(20) DEFAULT 'pending'
                          CHECK (status IN ('pending','succeeded','failed','refunded')),
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── SAVED JOBS ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_jobs (
        user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
        job_id     UUID REFERENCES jobs(id) ON DELETE CASCADE,
        saved_at   TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, job_id)
      );
    `);

    // ── MESSAGES ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id   UUID REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
        job_id      UUID REFERENCES jobs(id) ON DELETE SET NULL,
        content     TEXT NOT NULL,
        is_read     BOOLEAN DEFAULT FALSE,
        sent_at     TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── INDEXES ───────────────────────────────────────────────────────────────
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_employer    ON jobs(employer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_status      ON jobs(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_category    ON jobs(category_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_apps_job         ON applications(job_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_apps_seeker      ON applications(seeker_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);`);

    await client.query('COMMIT');
    console.log('✅ Migration complete — all tables created');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
