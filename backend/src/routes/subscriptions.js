const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/subscriptions/my - fan's active subs
router.get('/my', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT s.*, u.username, u.display_name, u.avatar_url, u.is_verified,
              st.name as tier_name, st.price, st.features
       FROM subscriptions s
       JOIN users u ON u.id = s.creator_id
       JOIN subscription_tiers st ON st.id = s.tier_id
       WHERE s.fan_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json({ subscriptions: rows });
  } catch {
    res.status(500).json({ error: 'Error al cargar suscripciones' });
  }
});

// GET /api/subscriptions/tiers/:creatorId - get creator's tiers
router.get('/tiers/:creatorId', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM subscription_tiers WHERE creator_id = $1 AND is_active = true ORDER BY price ASC',
      [req.params.creatorId]
    );
    res.json({ tiers: rows });
  } catch {
    res.status(500).json({ error: 'Error al cargar planes' });
  }
});

// POST /api/subscriptions/subscribe - subscribe to creator
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { creator_id, tier_id } = req.body;

    if (creator_id === req.user.id) {
      return res.status(400).json({ error: 'No puedes suscribirte a ti mismo' });
    }

    const { rows: tier } = await query(
      'SELECT * FROM subscription_tiers WHERE id = $1 AND creator_id = $2 AND is_active = true',
      [tier_id, creator_id]
    );
    if (!tier.length) return res.status(404).json({ error: 'Plan no encontrado' });

    const existing = await query(
      'SELECT id FROM subscriptions WHERE fan_id = $1 AND creator_id = $2 AND status = $3',
      [req.user.id, creator_id, 'active']
    );
    if (existing.rows.length) return res.status(409).json({ error: 'Ya tienes una suscripción activa' });

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO subscriptions (fan_id, creator_id, tier_id, status, amount, current_period_start, current_period_end)
         VALUES ($1, $2, $3, 'active', $4, NOW(), $5) RETURNING *`,
        [req.user.id, creator_id, tier_id, tier[0].price, periodEnd]
      );

      const platformFee = parseFloat((tier[0].price * 0.15).toFixed(2));
      const creatorEarnings = tier[0].price - platformFee;

      await client.query(
        'UPDATE users SET available_balance = available_balance + $1, total_earnings = total_earnings + $1, total_subscribers = total_subscribers + 1 WHERE id = $2',
        [creatorEarnings, creator_id]
      );

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, fee, net_amount, description)
         VALUES ($1, 'subscription', $2, $3, $4, $5)`,
        [creator_id, tier[0].price, platformFee, creatorEarnings, `Suscripción de @${req.user.username} - ${tier[0].name}`]
      );

      await client.query(
        `INSERT INTO notifications (user_id, type, title, body)
         VALUES ($1, 'new_subscriber', 'Nuevo suscriptor 🎉', $2)`,
        [creator_id, `@${req.user.username} se suscribió al plan ${tier[0].name}`]
      );

      // Dar puntos al fan por suscribirse
      await client.query(
        `INSERT INTO user_points (user_id, points, total_earned)
         VALUES ($1, 50, 50)
         ON CONFLICT (user_id) DO UPDATE SET
           points = user_points.points + 50,
           total_earned = user_points.total_earned + 50,
           updated_at = NOW()`,
        [req.user.id]
      );
      await client.query(
        `INSERT INTO points_transactions (user_id, points, type, description)
         VALUES ($1, 50, 'subscription', 'Puntos por nueva suscripción')`,
        [req.user.id]
      );

      // Verificar referido y dar recompensa
      const refResult = await client.query(
        `SELECT r.referrer_id FROM referrals r
         WHERE r.referred_id = $1 AND r.reward_given = false`,
        [req.user.id]
      );
      if (refResult.rows.length) {
        const referrerId = refResult.rows[0].referrer_id;
        await client.query(
          `INSERT INTO user_points (user_id, points, total_earned)
           VALUES ($1, 50, 50)
           ON CONFLICT (user_id) DO UPDATE SET
             points = user_points.points + 50,
             total_earned = user_points.total_earned + 50`,
          [referrerId]
        );
        await client.query(
          `UPDATE referrals SET reward_given = true WHERE referred_id = $1`,
          [req.user.id]
        );
      }

      return rows[0];
    });

    res.status(201).json({ subscription: result, message: '¡Suscripción activada!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar suscripción' });
  }
});

// DELETE /api/subscriptions/:id - cancel subscription
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM subscriptions WHERE id = $1 AND fan_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Suscripción no encontrada' });

    await query(
      'UPDATE subscriptions SET status = $1, cancel_at_period_end = true WHERE id = $2',
      ['cancelled', req.params.id]
    );

    await query(
      'UPDATE users SET total_subscribers = GREATEST(total_subscribers - 1, 0) WHERE id = $1',
      [rows[0].creator_id]
    );

    res.json({ message: 'Suscripción cancelada. Acceso hasta fin del período.' });
  } catch {
    res.status(500).json({ error: 'Error al cancelar suscripción' });
  }
});

// POST /api/subscriptions/tiers - creator creates a tier
router.post('/tiers', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'creator' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo creadores pueden crear planes' });
    }
    const { name, description, price, features = [] } = req.body;
    if (!name || !price || price <= 0) {
      return res.status(400).json({ error: 'Nombre y precio válido requeridos' });
    }

    const { rows } = await query(
      'INSERT INTO subscription_tiers (creator_id, name, description, price, features) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, name, description, price, JSON.stringify(features)]
    );
    res.status(201).json({ tier: rows[0] });
  } catch {
    res.status(500).json({ error: 'Error al crear plan' });
  }
});

module.exports = router;

// PATCH /api/subscriptions/tiers/:id - update tier
router.patch('/tiers/:id', authenticate, async (req, res) => {
  try {
    const { is_active } = req.body;
    await query(
      'UPDATE subscription_tiers SET is_active = $1 WHERE id = $2 AND creator_id = $3',
      [is_active, req.params.id, req.user.id]
    );
    res.json({ message: 'Plan actualizado' });
  } catch { res.status(500).json({ error: 'Error' }); }
});
