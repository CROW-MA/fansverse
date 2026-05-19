const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { addPoints } = require('./rewards');

// POST /api/tips — enviar propina
router.post('/', authenticate, async (req, res) => {
  try {
    const { creator_id, amount, message, post_id } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ error: 'Monto mínimo $1' });
    if (creator_id === req.user.id) return res.status(400).json({ error: 'No puedes enviarte propinas a ti mismo' });

    const platformFee    = parseFloat((amount * 0.15).toFixed(2));
    const creatorEarning = parseFloat((amount - platformFee).toFixed(2));

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO tips (fan_id, creator_id, amount, message, post_id) VALUES ($1,$2,$3,$4,$5)`,
        [req.user.id, creator_id, amount, message || null, post_id || null]
      );
      await client.query(
        `UPDATE users SET available_balance = available_balance + $1, total_earnings = total_earnings + $1 WHERE id = $2`,
        [creatorEarning, creator_id]
      );
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, fee, net_amount, description)
         VALUES ($1,'tip',$2,$3,$4,$5)`,
        [creator_id, amount, platformFee, creatorEarning, `Propina de fan`]
      );
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body)
         VALUES ($1,'tip','💝 Nueva propina','${message ? 'Con mensaje: '+message : 'Recibiste una propina'}')`,
        [creator_id]
      );
    });

    // Dar puntos al fan por enviar propina
    await addPoints(req.user.id, Math.floor(amount * 10), 'tip_sent', `Propina de $${amount}`);

    res.json({ message: `¡Propina de $${amount} enviada! 💝` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar propina' });
  }
});

// GET /api/tips/received — ver propinas recibidas (creador)
router.get('/received', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT t.*, u.username, u.display_name, u.avatar_url
       FROM tips t JOIN users u ON u.id = t.fan_id
       WHERE t.creator_id = $1 ORDER BY t.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ tips: rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
