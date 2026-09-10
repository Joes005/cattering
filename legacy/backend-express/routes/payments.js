const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

let stripe;
try { stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); }
catch { console.warn('Stripe not configured — payment routes disabled'); }

// ── POST /api/payments/checkout — create Stripe checkout session ─────────────
router.post('/checkout', authenticate, authorize('employer'), async (req, res, next) => {
  const { job_id, plan } = req.body;  // plan: 'boost' | 'featured'

  const PLANS = {
    boost:    { name: 'Job Boost',    amount: 2999  },  // $29.99
    featured: { name: 'Featured Job', amount: 9999  },  // $99.99
    premium:  { name: 'Premium Plan', amount: 19999 },  // $199.99
  };

  const selected = PLANS[plan] || PLANS.boost;

  try {
    if (!stripe) return res.status(503).json({ error: 'Payment service not configured' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Plated — ${selected.name}` },
          unit_amount: selected.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.CLIENT_URL}/payment/cancel`,
      metadata: { job_id: job_id || '', user_id: req.user.id, plan },
    });

    // Record pending payment
    await pool.query(
      `INSERT INTO payments (job_id, payer_id, amount_cents, stripe_session_id, status)
       VALUES ($1,$2,$3,$4,'pending')`,
      [job_id || null, req.user.id, selected.amount, session.id]
    );

    res.json({ url: session.url, session_id: session.id });
  } catch (err) { next(err); }
});

// ── POST /api/payments/webhook — Stripe webhook ──────────────────────────────
router.post('/webhook', require('express').raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.sendStatus(200);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await pool.query(
      `UPDATE payments
       SET status='succeeded', stripe_payment_id=$1, updated_at=NOW()
       WHERE stripe_session_id=$2`,
      [session.payment_intent, session.id]
    );
    // If it's a featured upgrade, update the job badge
    if (session.metadata?.plan === 'featured' && session.metadata?.job_id) {
      await pool.query(
        `UPDATE jobs SET badge='featured', updated_at=NOW() WHERE id=$1`,
        [session.metadata.job_id]
      );
    }
  }
  res.sendStatus(200);
});

// ── GET /api/payments/history — employer's payment history ───────────────────
router.get('/history', authenticate, authorize('employer', 'admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, j.title AS job_title
       FROM payments p
       LEFT JOIN jobs j ON j.id = p.job_id
       WHERE p.payer_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
