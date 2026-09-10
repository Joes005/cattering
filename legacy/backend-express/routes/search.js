const router = require('express').Router();
const pool   = require('../db/pool');

// ── GET /api/search?q=...&location=...&type=...&mode=jobs|talent ─────────────
// Powers the homepage Search Bar for both "Find Jobs" and "Find Talent" tabs
router.get('/', async (req, res, next) => {
  const { q, location, type, mode = 'jobs', limit = 20, offset = 0 } = req.query;

  try {
    if (mode === 'jobs') {
      let conditions = [`j.status = 'open'`];
      let params     = [];
      let i          = 1;

      if (q) {
        conditions.push(`(
          j.title ILIKE $${i} OR j.description ILIKE $${i}
          OR j.company_name ILIKE $${i} OR $${i} = ANY(j.tags)
        )`);
        params.push(`%${q}%`); i++;
      }
      if (location) {
        conditions.push(`j.location ILIKE $${i++}`);
        params.push(`%${location}%`);
      }
      if (type) {
        conditions.push(`j.job_type = $${i++}`);
        params.push(type);
      }

      const where = conditions.join(' AND ');
      const result = await pool.query(
        `SELECT j.id, j.title, j.company_name, j.location, j.job_type,
                j.salary_min, j.salary_max, j.salary_type, j.tags, j.badge,
                j.created_at, j.applicant_count,
                c.name AS category_name, c.icon AS category_icon
         FROM jobs j
         LEFT JOIN categories c ON c.id = j.category_id
         WHERE ${where}
         ORDER BY
           CASE j.badge WHEN 'featured' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
           j.created_at DESC
         LIMIT $${i++} OFFSET $${i}`,
        [...params, parseInt(limit), parseInt(offset)]
      );

      const count = await pool.query(
        `SELECT COUNT(*) FROM jobs j WHERE ${where}`, params
      );

      return res.json({ mode: 'jobs', results: result.rows, total: parseInt(count.rows[0].count) });
    }

    // ── mode = talent ────────────────────────────────────────────────────────
    let conditions = [`u.role = 'seeker'`];
    let params     = [];
    let i          = 1;

    if (q) {
      conditions.push(`(
        u.name ILIKE $${i} OR sp.title ILIKE $${i} OR $${i} = ANY(sp.skills)
      )`);
      params.push(`%${q}%`); i++;
    }
    if (location) {
      conditions.push(`u.location ILIKE $${i++}`);
      params.push(`%${location}%`);
    }

    const where = conditions.join(' AND ');
    const result = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, u.location,
              sp.title, sp.skills, sp.avg_rating, sp.review_count, sp.hourly_rate
       FROM users u
       JOIN seeker_profiles sp ON sp.user_id = u.id
       WHERE ${where}
       ORDER BY sp.avg_rating DESC, sp.review_count DESC
       LIMIT $${i++} OFFSET $${i}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const count = await pool.query(
      `SELECT COUNT(*) FROM users u JOIN seeker_profiles sp ON sp.user_id = u.id WHERE ${where}`,
      params
    );

    res.json({ mode: 'talent', results: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) { next(err); }
});

module.exports = router;
