// ============= USERS ROUTES =============
const express = require('express');
const usersRouter = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

usersRouter.get('/:username', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, username, display_name, bio, avatar_url, banner_url, role, is_verified,
              location, website, social_links, total_subscribers, created_at
       FROM users WHERE username = $1 AND is_active = true`,
      [req.params.username]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: rows[0] });
  } catch { res.status(500).json({ error: 'Error' }); }
});

usersRouter.put('/me/profile', authenticate, async (req, res) => {
  try {
    const { display_name, bio, location, website, social_links } = req.body;
    const { rows } = await query(
      `UPDATE users SET display_name=$1, bio=$2, location=$3, website=$4, social_links=$5, updated_at=NOW()
       WHERE id=$6 RETURNING id, username, display_name, bio, location, website, social_links, avatar_url`,
      [display_name, bio, location, website, JSON.stringify(social_links || {}), req.user.id]
    );
    res.json({ user: rows[0] });
  } catch { res.status(500).json({ error: 'Error al actualizar perfil' }); }
});

module.exports.usersRouter = usersRouter;

// ============= CREATORS ROUTES =============
const creatorsRouter = express.Router();
const { optionalAuth } = require('../middleware/auth');

creatorsRouter.get('/featured', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, username, display_name, bio, avatar_url, banner_url, is_verified, total_subscribers, COALESCE(category,'general') as category,
              (SELECT MIN(price) FROM subscription_tiers WHERE creator_id = u.id AND is_active = true) as min_price
       FROM users u WHERE role IN ('creator','admin') AND is_active = true
       ORDER BY total_subscribers DESC LIMIT 20`
    );
    res.json({ creators: rows });
  } catch { res.status(500).json({ error: 'Error' }); }
});

creatorsRouter.get('/:username/profile', optionalAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.banner_url,
                     u.is_verified, u.total_subscribers, u.category, u.location, u.website,
                     u.role, u.created_at,
              u.total_subscribers, u.location, u.social_links,
              (SELECT COUNT(*) FROM posts WHERE creator_id = u.id AND is_published = true) as post_count,
              CASE WHEN $2::uuid IS NOT NULL AND s.id IS NOT NULL THEN true ELSE false END as is_subscribed
       FROM users u
       LEFT JOIN subscriptions s ON s.creator_id = u.id AND s.fan_id = $2 AND s.status = 'active'
       WHERE u.username = $1 AND u.is_active = true`,
      [req.params.username, req.user?.id || null]
    );
    if (!rows.length) return res.status(404).json({ error: 'Creador no encontrado' });

    const { rows: tiers } = await query(
      'SELECT * FROM subscription_tiers WHERE creator_id = $1 AND is_active = true ORDER BY price',
      [rows[0].id]
    );
    res.json({ creator: rows[0], tiers });
  } catch { res.status(500).json({ error: 'Error' }); }
});

module.exports.creatorsRouter = creatorsRouter;

// ============= SEARCH ROUTES =============
const searchRouter = express.Router();
searchRouter.get('/', async (req, res) => {
  try {
    const { q = '', type = 'all', page = 1, limit = 20 } = req.query;
    if (!q.trim()) return res.json({ results: [] });
    const offset = (page - 1) * limit;
    const search = `%${q.toLowerCase()}%`;

    const { rows } = await query(
      `SELECT id, username, display_name, bio, avatar_url, is_verified, role, total_subscribers,
              (SELECT MIN(price) FROM subscription_tiers WHERE creator_id = u.id AND is_active = true) as min_price
       FROM users u
       WHERE is_active = true AND role IN ('creator', 'fan')
         AND (LOWER(username) LIKE $1 OR LOWER(display_name) LIKE $1)
       ORDER BY total_subscribers DESC LIMIT $2 OFFSET $3`,
      [search, limit, offset]
    );
    res.json({ results: rows, query: q });
  } catch { res.status(500).json({ error: 'Error en búsqueda' }); }
});
module.exports.searchRouter = searchRouter;

// ============= PAYMENTS ROUTES =============
const paymentsRouter = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

paymentsRouter.post('/create-payment-intent', authenticate, async (req, res) => {
  try {
    const { amount, currency = 'usd', type, reference_id } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ error: 'Monto inválido' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: { user_id: req.user.id, type, reference_id }
    });
    res.json({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear pago: ' + err.message });
  }
});

paymentsRouter.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object.id);
        break;
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        break;
    }
    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports.paymentsRouter = paymentsRouter;

// ============= NOTIFICATIONS ROUTES =============
const notifRouter = express.Router();

notifRouter.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const { rows: unread } = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ notifications: rows, unread: parseInt(unread[0].count) });
  } catch { res.status(500).json({ error: 'Error' }); }
});

notifRouter.post('/mark-read', authenticate, async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Notificaciones marcadas como leídas' });
  } catch { res.status(500).json({ error: 'Error' }); }
});

module.exports.notifRouter = notifRouter;
