const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, requireCreator } = require('../middleware/auth');
const { getJSON, setJSON } = require('../config/redis');

// GET /api/analytics/dashboard
router.get('/dashboard', authenticate, requireCreator, async (req, res) => {
  try {
    const cacheKey = `analytics:dashboard:${req.user.id}`;
    const cached = await getJSON(cacheKey);
    if (cached) return res.json(cached);

    const [earnings, subs, topPosts, recentSubs] = await Promise.all([
      // Earnings by day (last 30 days)
      query(
        `SELECT DATE(created_at) as date, SUM(net_amount) as amount, type
         FROM transactions WHERE user_id = $1 AND type != 'payout'
         AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at), type ORDER BY date`,
        [req.user.id]
      ),

      // Subscriber stats
      query(
        `SELECT 
           COUNT(*) FILTER (WHERE status = 'active') as active,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days' AND status = 'active') as new_this_week,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days' AND status = 'active') as new_this_month,
           COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
         FROM subscriptions WHERE creator_id = $1`,
        [req.user.id]
      ),

      // Top posts by revenue
      query(
        `SELECT p.id, p.title, p.type, p.view_count, p.like_count, p.purchase_count, p.total_revenue
         FROM posts p WHERE p.creator_id = $1 ORDER BY p.total_revenue DESC LIMIT 5`,
        [req.user.id]
      ),

      // Recent subscribers
      query(
        `SELECT s.created_at, s.amount, u.username, u.display_name, u.avatar_url, st.name as tier_name
         FROM subscriptions s
         JOIN users u ON u.id = s.fan_id
         JOIN subscription_tiers st ON st.id = s.tier_id
         WHERE s.creator_id = $1 ORDER BY s.created_at DESC LIMIT 10`,
        [req.user.id]
      )
    ]);

    // Monthly summary
    const { rows: monthly } = await query(
      `SELECT 
         COALESCE(SUM(net_amount) FILTER (WHERE type = 'subscription'), 0) as sub_revenue,
         COALESCE(SUM(net_amount) FILTER (WHERE type = 'ppv'), 0) as ppv_revenue,
         COALESCE(SUM(net_amount) FILTER (WHERE type = 'tip'), 0) as tip_revenue,
         COALESCE(SUM(net_amount), 0) as total_revenue
       FROM transactions 
       WHERE user_id = $1 AND type != 'payout'
       AND created_at >= date_trunc('month', NOW())`,
      [req.user.id]
    );

    const data = {
      earnings_chart: earnings.rows,
      subscribers: subs.rows[0],
      top_posts: topPosts.rows,
      recent_subscribers: recentSubs.rows,
      monthly: monthly[0],
      renewal_rate: subs.rows[0].active > 0
        ? Math.round((1 - subs.rows[0].cancelled / Math.max(subs.rows[0].active, 1)) * 100)
        : 0
    };

    await setJSON(cacheKey, data, 300); // cache 5 min
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar analytics' });
  }
});

// GET /api/analytics/earnings?period=week|month|year
router.get('/earnings', authenticate, requireCreator, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const intervals = { week: '7 days', month: '30 days', year: '365 days' };
    const interval = intervals[period] || '30 days';

    const { rows } = await query(
      `SELECT DATE(created_at) as date, SUM(net_amount) as total, type
       FROM transactions WHERE user_id = $1 AND type != 'payout'
       AND created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY DATE(created_at), type ORDER BY date ASC`,
      [req.user.id]
    );

    res.json({ earnings: rows, period });
  } catch {
    res.status(500).json({ error: 'Error al cargar ganancias' });
  }
});

// GET /api/analytics/content-performance
router.get('/content-performance', authenticate, requireCreator, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, type, view_count, like_count, comment_count, purchase_count, total_revenue,
              CASE WHEN view_count > 0 THEN ROUND((purchase_count::decimal / view_count) * 100, 2) ELSE 0 END as conversion_rate
       FROM posts WHERE creator_id = $1 AND is_published = true
       ORDER BY total_revenue DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ posts: rows });
  } catch {
    res.status(500).json({ error: 'Error al cargar rendimiento' });
  }
});

module.exports = router;
