const pool = require('./pool');
const bcrypt = require('bcryptjs');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Categories (matching frontend Browse by Role section) ────────────────
    const categories = [
      { name: 'Chef / Cook',      icon: '🧑‍🍳', job_count: 2140 },
      { name: 'Event Server',     icon: '🥂',   job_count: 3810 },
      { name: 'Catering Manager', icon: '📋',   job_count: 890  },
      { name: 'Delivery Driver',  icon: '🚐',   job_count: 1320 },
      { name: 'Pastry Chef',      icon: '🍰',   job_count: 540  },
      { name: 'Prep Cook',        icon: '🥗',   job_count: 1700 },
    ];
    for (const c of categories) {
      await client.query(
        `INSERT INTO categories (name, icon, job_count)
         VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
        [c.name, c.icon, c.job_count]
      );
    }

    // ── Admin user ───────────────────────────────────────────────────────────
    const hash = await bcrypt.hash('Admin@1234', 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, location, is_verified)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING`,
      ['Plated Admin', 'admin@plated.com', hash, 'admin', 'New York, NY', true]
    );

    // ── Employer users ───────────────────────────────────────────────────────
    const employers = [
      { name: 'Grand Regency Hotel',     email: 'hr@grandregency.com',   company: 'The Grand Regency Hotel',   location: 'New York, NY'    },
      { name: 'Marquee Events',          email: 'jobs@marqueeevents.com', company: 'Marquee Events Co.',        location: 'Chicago, IL'     },
      { name: 'Green Spoon Catering',    email: 'hire@greenspoon.com',    company: 'Green Spoon Catering',      location: 'Austin, TX'      },
      { name: 'SkyKitchen Services',     email: 'jobs@skykitchen.com',    company: 'SkyKitchen Services',       location: 'Los Angeles, CA' },
      { name: 'State University Dining', email: 'dining@stateuniv.edu',   company: 'State University Dining',   location: 'Boston, MA'      },
      { name: 'Sugarcraft Studio',       email: 'jobs@sugarcraft.com',    company: 'Sugarcraft Studio',         location: 'Miami, FL'       },
    ];
    const employerIds = [];
    const empHash = await bcrypt.hash('Employer@123', 12);
    for (const e of employers) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, location, is_verified)
         VALUES ($1,$2,$3,'employer',$4,true)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [e.name, e.email, empHash, e.location]
      );
      const uid = res.rows[0].id;
      employerIds.push(uid);
      await client.query(
        `INSERT INTO employer_profiles (user_id, company_name)
         VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING`,
        [uid, e.company]
      );
    }

    // ── Seeker users (matching Top Catering Talent section) ──────────────────
    const seekers = [
      { name: 'Marco Delgado',   email: 'marco@plated.com',  location: 'New York, NY', title: 'Executive Chef',      skills: ['Fine Dining','French Cuisine','HACCP'],         rating: 4.9, reviews: 84  },
      { name: 'Aisha Okonkwo',   email: 'aisha@plated.com',  location: 'Chicago, IL',  title: 'Pastry Chef',         skills: ['Weddings','Sugar Art','Gluten-Free'],           rating: 5.0, reviews: 41  },
      { name: 'Ryan Patel',      email: 'ryan@plated.com',   location: 'Austin, TX',   title: 'Catering Manager',    skills: ['Large Events','Logistics','Staff Management'],  rating: 4.7, reviews: 62  },
      { name: 'Sofia Reinholt',  email: 'sofia@plated.com',  location: 'Miami, FL',    title: 'Senior Banquet Server',skills: ['Sommelier','Fine Dining','Bilingual'],         rating: 4.8, reviews: 109 },
    ];
    const seekHash = await bcrypt.hash('Seeker@123', 12);
    for (const s of seekers) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, location, is_verified)
         VALUES ($1,$2,$3,'seeker',$4,true)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [s.name, s.email, seekHash, s.location]
      );
      const uid = res.rows[0].id;
      await client.query(
        `INSERT INTO seeker_profiles (user_id, title, skills, avg_rating, review_count)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id) DO NOTHING`,
        [uid, s.title, s.skills, s.rating, s.reviews]
      );
    }

    // ── Jobs (matching Featured Jobs section) ────────────────────────────────
    const catRes = await client.query('SELECT id, name FROM categories');
    const catMap  = {};
    catRes.rows.forEach(r => { catMap[r.name] = r.id; });

    const jobs = [
      {
        emp: 0, title: 'Head Banquet Chef',
        company: 'The Grand Regency Hotel', location: 'New York, NY',
        desc: 'Lead our award-winning banquet kitchen for world-class events.',
        type: 'full-time', min: 78000, max: 90000, salary_type: 'yearly',
        tags: ['Full-time','5+ yrs exp','Fine Dining'], badge: 'featured', cat: 'Chef / Cook'
      },
      {
        emp: 1, title: 'Event Catering Servers ×6',
        company: 'Marquee Events Co.', location: 'Chicago, IL',
        desc: 'High-energy servers needed for weekend events throughout Chicago.',
        type: 'gig', min: 28, max: 35, salary_type: 'hourly',
        tags: ['Gig / Weekend','Entry Level','Tipped'], badge: 'urgent', cat: 'Event Server'
      },
      {
        emp: 2, title: 'Catering Operations Manager',
        company: 'Green Spoon Catering', location: 'Austin, TX',
        desc: 'Oversee day-to-day catering operations for our fast-growing team.',
        type: 'full-time', min: 65000, max: 75000, salary_type: 'yearly',
        tags: ['Full-time','Management','Benefits'], badge: 'new', cat: 'Catering Manager'
      },
      {
        emp: 3, title: 'Airline Catering Supervisor',
        company: 'SkyKitchen Services', location: 'Los Angeles, CA',
        desc: 'Supervise airline meal production and delivery teams.',
        type: 'full-time', min: 58000, max: 65000, salary_type: 'yearly',
        tags: ['Full-time','Shift Work','Travel Perks'], badge: 'new', cat: 'Chef / Cook'
      },
      {
        emp: 4, title: 'Campus Dining Catering Lead',
        company: 'State University Dining', location: 'Boston, MA',
        desc: 'Lead catering for university events and department functions.',
        type: 'part-time', min: 22, max: 26, salary_type: 'hourly',
        tags: ['Part-time','Academic Year','Flexible'], badge: 'new', cat: 'Catering Manager'
      },
      {
        emp: 5, title: 'Pastry Chef — Weddings & Events',
        company: 'Sugarcraft Studio', location: 'Miami, FL',
        desc: 'Create stunning pastry art for weddings and luxury events.',
        type: 'contract', min: 48, max: 60, salary_type: 'hourly',
        tags: ['Contract','Creative','Pastry Art'], badge: 'featured', cat: 'Pastry Chef'
      },
    ];

    for (const j of jobs) {
      const empUser = await client.query(
        `SELECT id FROM users WHERE email = $1`,
        [employers[j.emp].email]
      );
      if (empUser.rows.length) {
        await client.query(
          `INSERT INTO jobs
           (employer_id, category_id, title, company_name, location, description,
            job_type, salary_min, salary_max, salary_type, tags, badge, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'open')`,
          [
            empUser.rows[0].id, catMap[j.cat], j.title, j.company,
            j.location, j.desc, j.type, j.min, j.max, j.salary_type,
            j.tags, j.badge
          ]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Seed complete — sample data inserted');
    console.log('   Admin:    admin@plated.com   / Admin@1234');
    console.log('   Employer: hr@grandregency.com / Employer@123');
    console.log('   Seeker:   marco@plated.com   / Seeker@123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
