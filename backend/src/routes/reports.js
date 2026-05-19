const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

// POST /api/reports — reportar usuario o post
router.post('/', authenticate, async (req, res) => {
  try {
    const { reported_user_id, reported_post_id, reason, description } = req.body;
    if (!reason) return res.status(400).json({ error: 'Motivo requerido' });

    const reasons = ['spam','contenido_ilegal','acoso','menor_edad','fraude','otro'];
    if (!reasons.includes(reason)) return res.status(400).json({ error: 'Motivo inválido' });

    await query(
      `INSERT INTO reports (reporter_id, reported_user_id, reported_post_id, reason, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, reported_user_id || null, reported_post_id || null, reason, description]
    );

    res.json({ message: 'Reporte enviado. Lo revisaremos pronto.' });
  } catch {
    res.status(500).json({ error: 'Error al enviar reporte' });
  }
});

// GET /api/reports — panel admin ver reportes
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const { rows } = await query(
      `SELECT r.*,
              u_reporter.username as reporter_username,
              u_reported.username as reported_username,
              p.title as post_title
       FROM reports r
       JOIN users u_reporter ON u_reporter.id = r.reporter_id
       LEFT JOIN users u_reported ON u_reported.id = r.reported_user_id
       LEFT JOIN posts p ON p.id = r.reported_post_id
       WHERE r.status = $1
       ORDER BY r.created_at DESC`,
      [status]
    );
    res.json({ reports: rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

// PATCH /api/reports/:id — resolver reporte (admin)
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { action, status } = req.body;
    await query(
      `UPDATE reports SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3`,
      [status, req.user.id, req.params.id]
    );
    // Si action es 'ban', suspender al usuario
    if (action === 'ban' && req.body.user_id) {
      await query('UPDATE users SET is_active = false WHERE id = $1', [req.body.user_id]);
    }
    res.json({ message: 'Reporte actualizado' });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
