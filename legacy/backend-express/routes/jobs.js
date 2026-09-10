const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

// ── GET /api/jobs/saved/mine — my saved jobs (MUST be before /:id) ───────────
router.get('/saved/mine', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT j.*, c.name AS category_name
       FROM saved_jobs sj
       JOIN jobs j ON j.id = sj.job_id
       LEFT JOIN categories c ON c.id = j.category_id
       WHERE sj.user_id = $1
       ORDER BY sj.saved_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/jobs/mine/posted — employer's posted jobs (MUST be before /:id) ─
router.get('/mine/posted', authenticate, authorize('employer', 'admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT j.*, c.name AS category_name,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS application_count
       FROM jobs j
       LEFT JOIN categories c ON c.id = j.category_id
       WHERE j.employer_id = $1
       ORDER BY j.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/jobs/featured — badge = featured (MUST be before /:id) ──────────
router.get('/featured', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT j.*, c.name AS category_name, c.icon AS category_icon,
              ep.company_name AS employer_company, ep.logo_url AS employer_logo
       FROM jobs j
       LEFT JOIN categories c ON c.id = j.category_id
       LEFT JOIN employer_profiles ep ON ep.user_id = j.employer_id
       WHERE j.badge = 'featured' AND j.status = 'open'
       ORDER BY j.created_at DESC LIMIT 6`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/jobs — list jobs with filters ───────────────────────────────────
router.get('/', async (req, res, next) => {
  const { type, location, category_id, badge, status = 'open',
          limit = 20, offset = 0 } = req.query;

  let conditions = ['j.status = $1'];
  let params     = [status];
  let i          = 2;

  if (type)        { conditions.push(`j.job_type = $${i++}`);     params.push(type); }
  if (location)    { conditions.push(`j.location ILIKE $${i++}`); params.push(`%${location}%`); }
  if (category_id) { conditions.push(`j.category_id = $${i++}`);  params.push(category_id); }
  if (badge)       { conditions.push(`j.badge = $${i++}`);        params.push(badge); }

  const where = conditions.join(' AND ');

  try {
    const result = await pool.query(
      `SELECT j.*, c.name AS category_name, c.icon AS category_icon,
              ep.company_name AS employer_company, ep.logo_url AS employer_logo
       FROM jobs j
       LEFT JOIN categories c ON c.id = j.category_id
       LEFT JOIN employer_profiles ep ON ep.user_id = j.employer_id
       WHERE ${where}
       ORDER BY j.created_at DESC
       LIMIT $${i++} OFFSET $${i}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const count = await pool.query(
      `SELECT COUNT(*) FROM jobs j WHERE ${where}`, params.slice(0, i - 2)
    );

    res.json({ jobs: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) { next(err); }
});



// ── GET /api/jobs/:id — single job ───────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT j.*, c.name AS category_name,
              u.name AS employer_name, ep.company_name, ep.logo_url, ep.website
       FROM jobs j
       LEFT JOIN categories c ON c.id = j.category_id
       LEFT JOIN users u ON u.id = j.employer_id
       LEFT JOIN employer_profiles ep ON ep.user_id = j.employer_id
       WHERE j.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── POST /api/jobs — create job (employer only) ──────────────────────────────
router.post('/', authenticate, authorize('employer', 'admin'), async (req, res, next) => {
  const { category_id, title, company_name, location, description, requirements,
          job_type, salary_min, salary_max, salary_type, tags, badge } = req.body;

  if (!title || !location || !description)
    return res.status(400).json({ error: 'title, location and description are required' });

  try {
    const ep = await pool.query(
      'SELECT company_name FROM employer_profiles WHERE user_id=$1', [req.user.id]
    );
    const cn = company_name || ep.rows[0]?.company_name || 'Unknown';

    const result = await pool.query(
      `INSERT INTO jobs
         (employer_id, category_id, title, company_name, location, description,
          requirements, job_type, salary_min, salary_max, salary_type, tags, badge)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [req.user.id, category_id, title, cn, location, description, requirements,
       job_type, salary_min, salary_max, salary_type, tags, badge || 'new']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── PUT /api/jobs/:id — update job ───────────────────────────────────────────
router.put('/:id', authenticate, authorize('employer', 'admin'), async (req, res, next) => {
  const { title, location, description, requirements, job_type,
          salary_min, salary_max, salary_type, tags, badge, status } = req.body;
  try {
    const job = await pool.query('SELECT employer_id FROM jobs WHERE id=$1', [req.params.id]);
    if (!job.rows.length) return res.status(404).json({ error: 'Job not found' });
    if (req.user.role !== 'admin' && job.rows[0].employer_id !== req.user.id)
      return res.status(403).json({ error: 'Not your job' });

    const result = await pool.query(
      `UPDATE jobs SET title=$1, location=$2, description=$3, requirements=$4,
        job_type=$5, salary_min=$6, salary_max=$7, salary_type=$8, tags=$9,
        badge=$10, status=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [title, location, description, requirements, job_type,
       salary_min, salary_max, salary_type, tags, badge, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── DELETE /api/jobs/:id — delete job ────────────────────────────────────────
router.delete('/:id', authenticate, authorize('employer', 'admin'), async (req, res, next) => {
  try {
    const job = await pool.query('SELECT employer_id FROM jobs WHERE id=$1', [req.params.id]);
    if (!job.rows.length) return res.status(404).json({ error: 'Job not found' });
    if (req.user.role !== 'admin' && job.rows[0].employer_id !== req.user.id)
      return res.status(403).json({ error: 'Not your job' });

    await pool.query('DELETE FROM jobs WHERE id=$1', [req.params.id]);
    res.json({ message: 'Job deleted' });
  } catch (err) { next(err); }
});

// ── POST /api/jobs/:id/save — save/unsave toggle ─────────────────────────────
router.post('/:id/save', authenticate, async (req, res, next) => {
  try {
    const exists = await pool.query(
      'SELECT 1 FROM saved_jobs WHERE user_id=$1 AND job_id=$2',
      [req.user.id, req.params.id]
    );
    if (exists.rows.length) {
      await pool.query('DELETE FROM saved_jobs WHERE user_id=$1 AND job_id=$2',
        [req.user.id, req.params.id]);
      return res.json({ saved: false });
    }
    await pool.query('INSERT INTO saved_jobs (user_id, job_id) VALUES ($1,$2)',
      [req.user.id, req.params.id]);
    res.json({ saved: true });
  } catch (err) { next(err); }
});

module.exports = router;
