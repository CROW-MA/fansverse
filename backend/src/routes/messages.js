const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/messages/conversations
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT DISTINCT ON (other_user)
         CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS other_user,
         m.content, m.created_at, m.is_read, m.is_ppv,
         u.username, u.display_name, u.avatar_url, u.is_verified,
         (SELECT COUNT(*) FROM messages 
          WHERE receiver_id = $1 AND sender_id = u.id AND is_read = false) as unread_count
       FROM messages m
       JOIN users u ON u.id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
       WHERE (m.sender_id = $1 OR m.receiver_id = $1)
         AND CASE WHEN m.sender_id = $1 THEN NOT m.is_deleted_sender ELSE NOT m.is_deleted_receiver END
       ORDER BY other_user, m.created_at DESC`,
      [req.user.id]
    );
    res.json({ conversations: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar conversaciones' });
  }
});

// GET /api/messages/:userId - get conversation
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { rows } = await query(
      `SELECT m.*, 
              s.username as sender_username, s.display_name as sender_name, s.avatar_url as sender_avatar,
              CASE WHEN m.is_ppv AND NOT m.ppv_purchased AND m.sender_id != $1 
                   THEN NULL ELSE m.media_url END as media_url_safe
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       WHERE ((m.sender_id = $1 AND m.receiver_id = $2 AND NOT m.is_deleted_sender)
           OR (m.sender_id = $2 AND m.receiver_id = $1 AND NOT m.is_deleted_receiver))
       ORDER BY m.created_at DESC LIMIT $3 OFFSET $4`,
      [req.user.id, req.params.userId, limit, offset]
    );

    // Mark as read
    query(
      'UPDATE messages SET is_read = true WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false',
      [req.user.id, req.params.userId]
    ).catch(() => {});

    res.json({ messages: rows.reverse() });
  } catch {
    res.status(500).json({ error: 'Error al cargar mensajes' });
  }
});

// POST /api/messages/:userId - send message
router.post('/:userId', authenticate, async (req, res) => {
  try {
    const { content, media_url, media_type, is_ppv = false, ppv_price } = req.body;

    if (!content && !media_url) {
      return res.status(400).json({ error: 'El mensaje debe tener texto o media' });
    }

    // Verify receiver exists
    const { rows: receiver } = await query('SELECT id FROM users WHERE id = $1 AND is_active = true', [req.params.userId]);
    if (!receiver.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { rows } = await query(
      `INSERT INTO messages (sender_id, receiver_id, content, media_url, media_type, is_ppv, ppv_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, req.params.userId, content, media_url, media_type, is_ppv, is_ppv ? ppv_price : null]
    );

    // Emit via socket (handled in socketService)
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.params.userId}`).emit('new_message', {
        ...rows[0],
        media_url: is_ppv ? null : media_url // hide ppv media from notification
      });
    }

    res.status(201).json({ message: rows[0] });
  } catch {
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// POST /api/messages/:messageId/purchase-ppv
router.post('/:messageId/purchase-ppv', authenticate, async (req, res) => {
  try {
    const { rows: msg } = await query(
      'SELECT * FROM messages WHERE id = $1 AND receiver_id = $2 AND is_ppv = true',
      [req.params.messageId, req.user.id]
    );

    if (!msg.length) return res.status(404).json({ error: 'Mensaje PPV no encontrado' });
    if (msg[0].ppv_purchased) return res.status(409).json({ error: 'Ya compraste este contenido' });

    const message = msg[0];
    const amount = parseFloat(message.ppv_price);
    const platformFee = parseFloat((amount * 0.15).toFixed(2));
    const creatorEarnings = amount - platformFee;

    await withTransaction(async (client) => {
      // Create purchase record
      const { rows: purchase } = await client.query(
        `INSERT INTO ppv_purchases (fan_id, post_id, creator_id, amount, platform_fee, creator_earnings)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [req.user.id, message.id, message.sender_id, amount, platformFee, creatorEarnings]
      );

      // Mark message as purchased
      await client.query(
        'UPDATE messages SET ppv_purchased = true, ppv_purchase_id = $1 WHERE id = $2',
        [purchase[0].id, message.id]
      );

      // Credit creator
      await client.query(
        'UPDATE users SET available_balance = available_balance + $1, total_earnings = total_earnings + $1 WHERE id = $2',
        [creatorEarnings, message.sender_id]
      );

      // Log transaction
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, fee, net_amount, description)
         VALUES ($1, 'ppv', $2, $3, $4, 'Compra PPV mensaje')`,
        [message.sender_id, amount, platformFee, creatorEarnings]
      );
    });

    // Return the full message with media
    const { rows: full } = await query('SELECT * FROM messages WHERE id = $1', [message.id]);
    res.json({ message: 'Contenido desbloqueado', full_message: full[0] });
  } catch {
    res.status(500).json({ error: 'Error al comprar contenido PPV' });
  }
});

// DELETE /api/messages/:messageId
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM messages WHERE id = $1', [req.params.messageId]);
    if (!rows.length) return res.status(404).json({ error: 'Mensaje no encontrado' });

    const msg = rows[0];
    if (msg.sender_id === req.user.id) {
      await query('UPDATE messages SET is_deleted_sender = true WHERE id = $1', [msg.id]);
    } else if (msg.receiver_id === req.user.id) {
      await query('UPDATE messages SET is_deleted_receiver = true WHERE id = $1', [msg.id]);
    } else {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    res.json({ message: 'Mensaje eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar mensaje' });
  }
});

module.exports = router;
