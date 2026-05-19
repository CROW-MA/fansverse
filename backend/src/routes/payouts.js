const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/database');
const { authenticate, requireCreator } = require('../middleware/auth');

const PLATFORM_FEE = parseFloat(process.env.PLATFORM_FEE_PERCENT || 15) / 100;
const INSTANT_FEE = parseFloat(process.env.INSTANT_PAYOUT_FEE_PERCENT || 1.5) / 100;
const MIN_PAYOUT = parseFloat(process.env.MIN_PAYOUT_AMOUNT || 20);

// GET /api/payouts/balance
router.get('/balance', authenticate, requireCreator, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT available_balance, pending_balance, total_earnings FROM users WHERE id = $1',
      [req.user.id]
    );
    const balance = rows[0];

    // Recent payouts
    const { rows: payouts } = await query(
      `SELECT id, amount, fee, net_amount, method, status, speed, created_at, completed_at
       FROM payouts WHERE creator_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [req.user.id]
    );

    // This month earnings
    const { rows: monthly } = await query(
      `SELECT COALESCE(SUM(net_amount), 0) as month_earnings
       FROM transactions WHERE user_id = $1 AND type != 'payout'
       AND created_at >= date_trunc('month', NOW())`,
      [req.user.id]
    );

    res.json({
      available: parseFloat(balance.available_balance),
      pending: parseFloat(balance.pending_balance),
      total_earnings: parseFloat(balance.total_earnings),
      month_earnings: parseFloat(monthly[0].month_earnings),
      recent_payouts: payouts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener balance' });
  }
});

// POST /api/payouts/request - KEY FEATURE: fast payouts
router.post('/request', authenticate, requireCreator, async (req, res) => {
  try {
    const { amount, method, speed = 'fast', destination_details } = req.body;

    if (!amount || amount < MIN_PAYOUT) {
      return res.status(400).json({ error: `El monto mínimo de retiro es $${MIN_PAYOUT}` });
    }

    const { rows } = await query('SELECT available_balance FROM users WHERE id = $1', [req.user.id]);
    const available = parseFloat(rows[0].available_balance);

    if (amount > available) {
      return res.status(400).json({ error: `Saldo insuficiente. Disponible: $${available.toFixed(2)}` });
    }

    // Calculate fees by speed
    const feeRates = { instant: INSTANT_FEE, fast: 0, standard: 0 };
    const feeRate = feeRates[speed] || 0;
    const fee = parseFloat((amount * feeRate).toFixed(2));
    const netAmount = parseFloat((amount - fee).toFixed(2));

    // Estimated arrival
    const arrivalMap = {
      instant: new Date(Date.now() + 30 * 60 * 1000),      // 30 min
      fast: new Date(Date.now() + 2 * 60 * 60 * 1000),     // 2 hours
      standard: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    const result = await withTransaction(async (client) => {
      // Deduct from balance
      await client.query(
        'UPDATE users SET available_balance = available_balance - $1 WHERE id = $2',
        [amount, req.user.id]
      );

      // Create payout record
      const { rows: payout } = await client.query(
        `INSERT INTO payouts (creator_id, amount, fee, net_amount, method, speed, destination_details, estimated_arrival, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          req.user.id, amount, fee, netAmount, method, speed,
          JSON.stringify(destination_details || {}),
          arrivalMap[speed],
          speed === 'instant' ? 'processing' : 'pending'
        ]
      );

      // Log transaction
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, fee, net_amount, description, metadata)
         VALUES ($1, 'payout', $2, $3, $4, $5, $6)`,
        [req.user.id, amount, fee, netAmount, `Retiro vía ${method} - ${speed}`, JSON.stringify({ payout_id: payout[0].id })]
      );

      return payout[0];
    });

    // For instant: auto-process (in production, integrate Nequi/Stripe API here)
    if (speed === 'instant') {
      processInstantPayout(result.id, req.user.id, netAmount, method, destination_details).catch(console.error);
    }

    const messages = {
      instant: `⚡ Retiro instantáneo procesado. Recibirás $${netAmount.toFixed(2)} en tu ${method} en minutos.`,
      fast: `🚀 Retiro en proceso. Recibirás $${netAmount.toFixed(2)} en ~2 horas.`,
      standard: `🏦 Retiro registrado. Recibirás $${netAmount.toFixed(2)} en ~24 horas.`
    };

    res.status(201).json({
      message: messages[speed],
      payout: result,
      net_amount: netAmount,
      fee,
      estimated_arrival: arrivalMap[speed]
    });
  } catch (err) {
    console.error('Payout error:', err);
    res.status(500).json({ error: 'Error al procesar el retiro' });
  }
});

// Simulate instant payout processing (integrate real payment APIs here)
async function processInstantPayout(payoutId, creatorId, amount, method, destination) {
  try {
    // In production: call Nequi API, Bancolombia API, or Stripe instant payouts
    await new Promise(r => setTimeout(r, 2000));

    await query(
      `UPDATE payouts SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [payoutId]
    );

    // Create notification
    await query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, 'payout_completed', 'Retiro completado ⚡', $2, $3)`,
      [
        creatorId,
        `Tu retiro de $${amount.toFixed(2)} vía ${method} fue procesado exitosamente`,
        JSON.stringify({ payoutId, amount, method })
      ]
    );
  } catch (err) {
    console.error('Error processing instant payout:', err);
    await query("UPDATE payouts SET status = 'failed' WHERE id = $1", [payoutId]);
    // Refund balance
    await query('UPDATE users SET available_balance = available_balance + $1 WHERE id = $2', [amount, creatorId]);
  }
}

// GET /api/payouts/history
router.get('/history', authenticate, requireCreator, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE creator_id = $1';
    const params = [req.user.id];

    if (status) {
      whereClause += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    const { rows } = await query(
      `SELECT * FROM payouts ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const { rows: total } = await query(`SELECT COUNT(*) FROM payouts ${whereClause}`, params);

    res.json({ payouts: rows, total: parseInt(total[0].count), page: parseInt(page) });
  } catch {
    res.status(500).json({ error: 'Error al cargar historial' });
  }
});

// GET /api/payouts/transactions
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const offset = (page - 1) * limit;
    const params = [req.user.id];
    let filter = '';
    if (type) { filter = ` AND type = $2`; params.push(type); }

    const { rows } = await query(
      `SELECT * FROM transactions WHERE user_id = $1 ${filter} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json({ transactions: rows });
  } catch {
    res.status(500).json({ error: 'Error al cargar transacciones' });
  }
});

module.exports = router;
