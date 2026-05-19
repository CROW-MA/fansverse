const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/database');
const { authenticate, requireCreator } = require('../middleware/auth');

// POST /api/packs — crear paquete
router.post('/', authenticate, requireCreator, async (req, res) => {
  try {
    const { title, description, price, original_price, post_ids = [], thumbnail_url, expires_at } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'Título y precio requeridos' });

    const discount = original_price ? Math.round((1 - price/original_price) * 100) : 0;

    const { rows } = await query(
      `INSERT INTO content_packs (creator_id, title, description, price, original_price, discount_percent, post_ids, thumbnail_url, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, title, description, price, original_price||null, discount, post_ids, thumbnail_url||null, expires_at||null]
    );
    res.status(201).json({ pack: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear paquete' });
  }
});

// GET /api/packs/creator/:creatorId — paquetes de un creador
router.get('/creator/:creatorId', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM content_packs
       WHERE creator_id = $1 AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`,
      [req.params.creatorId]
    );
    res.json({ packs: rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

// POST /api/packs/:id/purchase — comprar paquete
router.post('/:id/purchase', authenticate, async (req, res) => {
  try {
    const { rows: pack } = await query('SELECT * FROM content_packs WHERE id=$1 AND is_active=true', [req.params.id]);
    if (!pack.length) return res.status(404).json({ error: 'Paquete no encontrado' });

    const { rows: existing } = await query(
      'SELECT id FROM pack_purchases WHERE fan_id=$1 AND pack_id=$2',
      [req.user.id, req.params.id]
    );
    if (existing.length) return res.status(409).json({ error: 'Ya compraste este paquete' });

    const p = pack[0];
    const platformFee = parseFloat((p.price * 0.15).toFixed(2));
    const creatorEarning = parseFloat((p.price - platformFee).toFixed(2));

    await withTransaction(async (client) => {
      await client.query(
        'INSERT INTO pack_purchases (fan_id, pack_id, amount) VALUES ($1,$2,$3)',
        [req.user.id, req.params.id, p.price]
      );
      await client.query(
        'UPDATE content_packs SET purchase_count = purchase_count + 1 WHERE id=$1',
        [req.params.id]
      );
      await client.query(
        'UPDATE users SET available_balance=available_balance+$1, total_earnings=total_earnings+$1 WHERE id=$2',
        [creatorEarning, p.creator_id]
      );
    });

    res.json({ message: '¡Paquete desbloqueado!', pack: p });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al comprar paquete' });
  }
});

// GET /api/packs/my — mis paquetes (creador)
router.get('/my', authenticate, requireCreator, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM content_packs WHERE creator_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ packs: rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
