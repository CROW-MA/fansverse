const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) return null;
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

// POST /api/payments/create-payment-intent
router.post('/create-payment-intent', authenticate, async (req, res) => {
  try {
    const { amount, type, reference_id } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ error: 'Monto inválido' });

    const stripe = getStripe();
    if (!stripe) {
      // Modo simulado para desarrollo sin Stripe real
      return res.json({
        client_secret: 'sim_' + Date.now(),
        simulated: true,
        amount
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: { user_id: req.user.id, type, reference_id }
    });
    res.json({ client_secret: paymentIntent.client_secret, simulated: false });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: 'Error al crear pago: ' + err.message });
  }
});

// POST /api/payments/purchase-ppv/:postId
router.post('/purchase-ppv/:postId', authenticate, async (req, res) => {
  try {
    const { postId } = req.params;
    const { payment_intent_id, simulated } = req.body;

    // Verificar que el post existe y tiene precio
    const { rows: postRows } = await query(
      'SELECT id, creator_id, ppv_price, type FROM posts WHERE id = $1 AND is_published = true',
      [postId]
    );
    if (!postRows.length) return res.status(404).json({ error: 'Post no encontrado' });
    const post = postRows[0];

    if (post.type !== 'ppv') return res.status(400).json({ error: 'Este post no es PPV' });
    if (post.creator_id === req.user.id) return res.status(400).json({ error: 'No puedes comprar tu propio contenido' });

    // Verificar si ya lo compró
    const { rows: existing } = await query(
      'SELECT id FROM ppv_purchases WHERE fan_id = $1 AND post_id = $2',
      [req.user.id, postId]
    );
    if (existing.length) return res.status(409).json({ error: 'Ya tienes acceso a este contenido' });

    const amount = parseFloat(post.ppv_price);
    const platformFee = parseFloat((amount * 0.15).toFixed(2));
    const creatorEarnings = parseFloat((amount - platformFee).toFixed(2));

    await withTransaction(async (client) => {
      // Registrar compra
      await client.query(
        `INSERT INTO ppv_purchases (fan_id, post_id, creator_id, amount, platform_fee, creator_earnings, stripe_payment_intent_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.id, postId, post.creator_id, amount, platformFee, creatorEarnings, payment_intent_id || 'sim_' + Date.now()]
      );

      // Acreditar al creador
      await client.query(
        `UPDATE users SET available_balance = available_balance + $1, total_earnings = total_earnings + $1 WHERE id = $2`,
        [creatorEarnings, post.creator_id]
      );

      // Actualizar stats del post
      await client.query(
        `UPDATE posts SET purchase_count = purchase_count + 1, total_revenue = total_revenue + $1 WHERE id = $2`,
        [amount, postId]
      );

      // Registrar transacción
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, fee, net_amount, description)
         VALUES ($1, 'ppv', $2, $3, $4, $5)`,
        [post.creator_id, amount, platformFee, creatorEarnings, `PPV comprado por fan`]
      );
    });

    // Retornar el post completo con acceso
    const { rows: fullPost } = await query('SELECT * FROM posts WHERE id = $1', [postId]);
    res.json({ success: true, post: fullPost[0], message: '¡Contenido desbloqueado!' });
  } catch (err) {
    console.error('PPV purchase error:', err);
    res.status(500).json({ error: 'Error al procesar compra' });
  }
});

// POST /api/payments/subscribe
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { tier_id, payment_intent_id, simulated } = req.body;

    const { rows: tierRows } = await query(
      'SELECT * FROM subscription_tiers WHERE id = $1 AND is_active = true',
      [tier_id]
    );
    if (!tierRows.length) return res.status(404).json({ error: 'Plan no encontrado' });
    const tier = tierRows[0];

    if (tier.creator_id === req.user.id) return res.status(400).json({ error: 'No puedes suscribirte a ti mismo' });

    const { rows: existing } = await query(
      'SELECT id FROM subscriptions WHERE fan_id = $1 AND creator_id = $2 AND status = $3',
      [req.user.id, tier.creator_id, 'active']
    );
    if (existing.length) return res.status(409).json({ error: 'Ya tienes una suscripción activa' });

    const amount = parseFloat(tier.price);
    const platformFee = parseFloat((amount * 0.15).toFixed(2));
    const creatorEarnings = parseFloat((amount - platformFee).toFixed(2));
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO subscriptions (fan_id, creator_id, tier_id, status, amount, current_period_start, current_period_end)
         VALUES ($1, $2, $3, 'active', $4, NOW(), $5)`,
        [req.user.id, tier.creator_id, tier_id, amount, periodEnd]
      );
      await client.query(
        `UPDATE users SET available_balance = available_balance + $1, total_earnings = total_earnings + $1, total_subscribers = total_subscribers + 1 WHERE id = $2`,
        [creatorEarnings, tier.creator_id]
      );
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, fee, net_amount, description) VALUES ($1, 'subscription', $2, $3, $4, $5)`,
        [tier.creator_id, amount, platformFee, creatorEarnings, `Suscripción plan ${tier.name}`]
      );
    });

    res.json({ success: true, message: '¡Suscripción activada!' });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Error al procesar suscripción' });
  }
});

// Webhook Stripe (producción)
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  res.json({ received: true });
});

module.exports = router;
