const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate } = require('../middleware/auth');

// ── GET /api/talent/top — top rated (MUST be before /:id) ────────────────────
router.get('/top', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, u.location,
              sp.title, sp.skills, sp.avg_rating, sp.review_count
       FROM users u
       JOIN seeker_profiles sp ON sp.user_id = u.id
       WHERE u.role = 'seeker' AND sp.avg_rating > 0
       ORDER BY sp.avg_rating DESC, sp.review_count DESC
       LIMIT 4`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/talent/messages/inbox (MUST be before /:id) ─────────────────────
router.get('/messages/inbox', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.name AS sender_name, u.avatar_url AS sender_avatar
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.receiver_id = $1
       ORDER BY m.sent_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/talent — browse all seekers ─────────────────────────────────────
router.get('/', async (req, res, next) => {
  const { location, skill, title, min_rating, limit = 20, offset = 0 } = req.query;

  let conditions = [`u.role = 'seeker'`];
  let params     = [];
  let i          = 1;

  if (location)   { conditions.push(`u.location ILIKE $${i++}`);          params.push(`%${location}%`); }
  if (title)      { conditions.push(`sp.title ILIKE $${i++}`);            params.push(`%${title}%`); }
  if (skill)      { conditions.push(`$${i++} = ANY(sp.skills)`);          params.push(skill); }
  if (min_rating) { conditions.push(`sp.avg_rating >= $${i++}`);          params.push(parseFloat(min_rating)); }

  const where = conditions.join(' AND ');

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, u.location,
              sp.title, sp.years_exp, sp.hourly_rate, sp.availability,
              sp.skills, sp.certifications, sp.avg_rating, sp.review_count
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
    res.json({ talent: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) { next(err); }
});

module.exports = router;
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.location, u.bio,
              sp.title, sp.years_exp, sp.hourly_rate, sp.availability,
              sp.skills, sp.certifications, sp.avg_rating, sp.review_count,
              sp.resume_url
       FROM users u
       JOIN seeker_profiles sp ON sp.user_id = u.id
       WHERE u.id = $1 AND u.role = 'seeker'`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Talent not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── POST /api/talent/:id/message — send a connect message ────────────────────
router.post('/:id/message', authenticate, async (req, res, next) => {
  const { content, job_id } = req.body;
  if (!content) return res.status(400).json({ error: 'Message content required' });

  try {
    const receiver = await pool.query('SELECT id FROM users WHERE id=$1', [req.params.id]);
    if (!receiver.rows.length) return res.status(404).json({ error: 'User not found' });

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, job_id, content)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, req.params.id, job_id || null, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
