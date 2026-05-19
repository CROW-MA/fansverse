const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/rewards/points — ver mis puntos
router.get('/points', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT up.*, 
        (SELECT json_agg(pt ORDER BY pt.created_at DESC) FROM 
          (SELECT * FROM points_transactions WHERE user_id = $1 LIMIT 20) pt
        ) as history
       FROM user_points up WHERE up.user_id = $1`,
      [req.user.id]
    );
    if (!rows.length) {
      await query('INSERT INTO user_points (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [req.user.id]);
      return res.json({ points: 0, total_earned: 0, history: [] });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar puntos' });
  }
});

// POST /api/rewards/points/add — agregar puntos (interno)
const addPoints = async (userId, points, type, description, referenceId = null) => {
  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO user_points (user_id, points, total_earned)
         VALUES ($1, $2, $2)
         ON CONFLICT (user_id) DO UPDATE
         SET points = user_points.points + $2,
             total_earned = user_points.total_earned + $2,
             updated_at = NOW()`,
        [userId, points]
      );
      await client.query(
        `INSERT INTO points_transactions (user_id, points, type, description, reference_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, points, type, description, referenceId]
      );
      await client.query(
        'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
        [points, userId]
      );
    });
  } catch (err) {
    console.error('Error adding points:', err);
  }
};

// POST /api/rewards/points/redeem — canjear puntos
router.post('/points/redeem', authenticate, async (req, res) => {
  try {
    const { points_to_redeem } = req.body;
    const POINTS_TO_USD = 100; // 100 puntos = $1 USD

    const { rows } = await query('SELECT points FROM user_points WHERE user_id = $1', [req.user.id]);
    if (!rows.length || rows[0].points < points_to_redeem) {
      return res.status(400).json({ error: 'Puntos insuficientes' });
    }

    const usd_value = parseFloat((points_to_redeem / POINTS_TO_USD).toFixed(2));

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE user_points SET points = points - $1, total_redeemed = total_redeemed + $1 WHERE user_id = $2`,
        [points_to_redeem, req.user.id]
      );
      await client.query(
        `INSERT INTO points_transactions (user_id, points, type, description) VALUES ($1, $2, 'redeem', $3)`,
        [req.user.id, -points_to_redeem, `Canje de ${points_to_redeem} puntos por $${usd_value} USD`]
      );
      // Acreditar al balance del usuario
      await client.query(
        'UPDATE users SET available_balance = available_balance + $1 WHERE id = $2',
        [usd_value, req.user.id]
      );
    });

    res.json({ message: `¡Canjeaste ${points_to_redeem} puntos por $${usd_value} USD!`, usd_value });
  } catch (err) {
    res.status(500).json({ error: 'Error al canjear puntos' });
  }
});

// GET /api/rewards/badges — ver mis insignias
router.get('/badges', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT b.*, ub.earned_at,
              CASE WHEN ub.id IS NOT NULL THEN true ELSE false END as earned
       FROM badges b
       LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = $1
       ORDER BY b.requirement_value ASC`,
      [req.user.id]
    );
    res.json({ badges: rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

// GET /api/rewards/referral — mi código de referido
router.get('/referral', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.referral_code, u.id,
              COALESCE(COUNT(r.id), 0) as total_referrals,
              COALESCE(COUNT(r.id) FILTER (WHERE r.reward_given), 0) as rewarded
       FROM users u
       LEFT JOIN referrals r ON r.referrer_id = u.id
       WHERE u.id = $1
       GROUP BY u.referral_code, u.id`,
      [req.user.id]
    );
    let code = rows[0]?.referral_code;
    // Generar código si no tiene
    if (!code) {
      const { query } = require('../config/database');
      const newCode = Math.random().toString(36).substring(2,10).toUpperCase();
      await query('UPDATE users SET referral_code = $1 WHERE id = $2', [newCode, req.user.id]);
      code = newCode;
    }
    const frontendUrl = process.env.FRONTEND_URL || 'https://fansverse.site';
    res.json({
      code,
      link: `${frontendUrl}/register?ref=${code}`,
      total_referrals: parseInt(rows[0]?.total_referrals || 0),
      rewarded: parseInt(rows[0]?.rewarded || 0),
      reward_per_referral: '50 puntos ($0.50)'
    });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
module.exports.addPoints = addPoints;

// GET /api/rewards/affiliate — programa de afiliados para creadores
router.get('/affiliate', authenticate, async (req, res) => {
  try {
    const { query } = require('../config/database');

    // Ver creadores referidos por este usuario
    const { rows } = await query(
      `SELECT
        u.username, u.display_name, u.avatar_url, u.role,
        u.total_earnings, u.total_subscribers,
        r.created_at as referred_at, r.reward_given,
        -- Comisión del afiliado: 5% de lo que gana el creador referido
        ROUND(u.total_earnings * 0.05, 2) as affiliate_earnings
       FROM referrals r
       JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = $1
         AND u.role = 'creator'
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    const totalAffiliateEarnings = rows.reduce((sum, r) => sum + parseFloat(r.affiliate_earnings || 0), 0);

    res.json({
      referred_creators: rows,
      total_affiliate_earnings: totalAffiliateEarnings.toFixed(2),
      commission_rate: '5%',
      description: 'Ganas el 5% de las ganancias de cada creador que refieras, de por vida.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error' });
  }
});
