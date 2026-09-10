const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool    = require('../db/pool');
const { authenticate } = require('../middleware/auth');

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be 6+ characters'),
  body('role').isIn(['seeker','employer']).withMessage('Role must be seeker or employer'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, role, location, company_name } = req.body;
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, location)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, location, created_at`,
      [name, email, hash, role, location || null]
    );
    const user = result.rows[0];

    // Create role-specific profile
    if (role === 'seeker') {
      await pool.query('INSERT INTO seeker_profiles (user_id) VALUES ($1)', [user.id]);
    } else if (role === 'employer') {
      const cn = company_name || name;
      await pool.query(
        'INSERT INTO employer_profiles (user_id, company_name) VALUES ($1,$2)',
        [user.id, cn]
      );
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({ token, user });
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, password_hash, avatar_url, location FROM users WHERE email=$1',
      [email]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    delete user.password_hash;
    res.json({ token, user });
  } catch (err) { next(err); }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.location, u.bio,
              u.phone, u.is_verified, u.created_at,
              sp.title, sp.years_exp, sp.hourly_rate, sp.availability,
              sp.skills, sp.certifications, sp.avg_rating, sp.review_count,
              ep.company_name, ep.company_size, ep.industry, ep.website, ep.logo_url
       FROM users u
       LEFT JOIN seeker_profiles  sp ON sp.user_id = u.id
       LEFT JOIN employer_profiles ep ON ep.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
router.put('/profile', authenticate, async (req, res, next) => {
  const { name, location, bio, phone, title, skills, hourly_rate, availability,
          company_name, company_size, industry, website } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name=$1, location=$2, bio=$3, phone=$4, updated_at=NOW() WHERE id=$5',
      [name, location, bio, phone, req.user.id]
    );

    if (req.user.role === 'seeker') {
      await pool.query(
        `UPDATE seeker_profiles
         SET title=$1, skills=$2, hourly_rate=$3, availability=$4, updated_at=NOW()
         WHERE user_id=$5`,
        [title, skills, hourly_rate, availability, req.user.id]
      );
    }
    if (req.user.role === 'employer') {
      await pool.query(
        `UPDATE employer_profiles
         SET company_name=$1, company_size=$2, industry=$3, website=$4, updated_at=NOW()
         WHERE user_id=$5`,
        [company_name, company_size, industry, website, req.user.id]
      );
    }
    res.json({ message: 'Profile updated' });
  } catch (err) { next(err); }
});

module.exports = router;
