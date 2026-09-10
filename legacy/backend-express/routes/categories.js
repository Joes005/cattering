// ════════════════════════════════════════════════════════════════════════════
//  categories.js
// ════════════════════════════════════════════════════════════════════════════
const router   = require('express').Router();
const pool     = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, (SELECT COUNT(*) FROM jobs j WHERE j.category_id = c.id AND j.status='open') AS live_jobs
       FROM categories c ORDER BY c.name`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/categories (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const result = await pool.query(
      'INSERT INTO categories (name, icon) VALUES ($1,$2) RETURNING *', [name, icon]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
