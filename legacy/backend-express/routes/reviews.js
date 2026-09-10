const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate } = require('../middleware/auth');

// ── POST /api/reviews — leave a review ───────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  const { job_id, reviewee_id, rating, comment } = req.body;
  if (!reviewee_id || !rating)
    return res.status(400).json({ error: 'reviewee_id and rating are required' });
  if (rating < 1 || rating > 5)
    return res.status(400).json({ error: 'Rating must be 1–5' });

  try {
    const result = await pool.query(
      `INSERT INTO reviews (job_id, reviewer_id, reviewee_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [job_id || null, req.user.id, reviewee_id, rating, comment]
    );

    // Recalculate reviewee average
    await pool.query(
      `UPDATE seeker_profiles
       SET avg_rating   = (SELECT AVG(rating) FROM reviews WHERE reviewee_id = $1),
           review_count = (SELECT COUNT(*)    FROM reviews WHERE reviewee_id = $1),
           updated_at   = NOW()
       WHERE user_id = $1`,
      [reviewee_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── GET /api/reviews/user/:userId — reviews for a user ───────────────────────
router.get('/user/:userId', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name AS reviewer_name, u.avatar_url AS reviewer_avatar,
              j.title AS job_title
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       LEFT JOIN jobs j ON j.id = r.job_id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
