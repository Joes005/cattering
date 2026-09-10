const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

// ── POST /api/applications — seeker applies to a job ────────────────────────
router.post('/', authenticate, authorize('seeker'), async (req, res, next) => {
  const { job_id, cover_note } = req.body;
  if (!job_id) return res.status(400).json({ error: 'job_id is required' });

  try {
    // Check job exists and is open
    const job = await pool.query('SELECT id, status FROM jobs WHERE id=$1', [job_id]);
    if (!job.rows.length || job.rows[0].status !== 'open')
      return res.status(400).json({ error: 'Job not found or not open' });

    const result = await pool.query(
      `INSERT INTO applications (job_id, seeker_id, cover_note)
       VALUES ($1,$2,$3) RETURNING *`,
      [job_id, req.user.id, cover_note]
    );

    // Increment applicant count
    await pool.query('UPDATE jobs SET applicant_count = applicant_count + 1 WHERE id=$1', [job_id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already applied to this job' });
    next(err);
  }
});

// ── GET /api/applications/mine — seeker's applications ──────────────────────
router.get('/mine', authenticate, authorize('seeker'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.*, j.title, j.company_name, j.location, j.job_type,
              j.salary_min, j.salary_max, j.salary_type, j.badge
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.seeker_id = $1
       ORDER BY a.applied_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/applications/job/:jobId — employer views applicants for a job ──
router.get('/job/:jobId', authenticate, authorize('employer', 'admin'), async (req, res, next) => {
  try {
    // Verify ownership
    const job = await pool.query('SELECT employer_id FROM jobs WHERE id=$1', [req.params.jobId]);
    if (!job.rows.length) return res.status(404).json({ error: 'Job not found' });
    if (req.user.role !== 'admin' && job.rows[0].employer_id !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });

    const result = await pool.query(
      `SELECT a.*,
              u.name AS seeker_name, u.email AS seeker_email, u.avatar_url,
              u.location AS seeker_location,
              sp.title AS seeker_title, sp.skills, sp.avg_rating, sp.review_count,
              sp.hourly_rate, sp.resume_url
       FROM applications a
       JOIN users u ON u.id = a.seeker_id
       LEFT JOIN seeker_profiles sp ON sp.user_id = a.seeker_id
       WHERE a.job_id = $1
       ORDER BY a.applied_at DESC`,
      [req.params.jobId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/applications/:id — single application ──────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.*, j.title, j.company_name, j.employer_id,
              u.name AS seeker_name, u.email AS seeker_email
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.seeker_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Application not found' });

    const app = result.rows[0];
    // Only seeker or the job's employer (or admin) may view
    const isOwner = app.seeker_id === req.user.id
                 || app.employer_id === req.user.id
                 || req.user.role === 'admin';
    if (!isOwner) return res.status(403).json({ error: 'Access denied' });

    res.json(app);
  } catch (err) { next(err); }
});

// ── PATCH /api/applications/:id/status — employer updates status ─────────────
router.patch('/:id/status', authenticate, authorize('employer', 'admin'), async (req, res, next) => {
  const { status } = req.body;
  const allowed = ['reviewed', 'accepted', 'rejected'];
  if (!allowed.includes(status))
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });

  try {
    const app = await pool.query(
      `SELECT a.id, j.employer_id
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!app.rows.length) return res.status(404).json({ error: 'Application not found' });
    if (req.user.role !== 'admin' && app.rows[0].employer_id !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });

    const result = await pool.query(
      `UPDATE applications SET status=$1, updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── DELETE /api/applications/:id — seeker withdraws ─────────────────────────
router.delete('/:id', authenticate, authorize('seeker'), async (req, res, next) => {
  try {
    const app = await pool.query(
      'SELECT seeker_id, job_id FROM applications WHERE id=$1', [req.params.id]
    );
    if (!app.rows.length) return res.status(404).json({ error: 'Not found' });
    if (app.rows[0].seeker_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });

    await pool.query('DELETE FROM applications WHERE id=$1', [req.params.id]);
    await pool.query(
      'UPDATE jobs SET applicant_count = GREATEST(0, applicant_count - 1) WHERE id=$1',
      [app.rows[0].job_id]
    );
    res.json({ message: 'Application withdrawn' });
  } catch (err) { next(err); }
});

module.exports = router;
