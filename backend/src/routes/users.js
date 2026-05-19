const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/users/me/profile - update
router.put('/me/profile', authenticate, async (req, res) => {
  try {
    const { display_name, bio, location, website, category } = req.body;
    const { rows } = await query(
      `UPDATE users SET display_name=$1, bio=$2, location=$3, website=$4, category=$5, updated_at=NOW()
       WHERE id=$6 RETURNING id, username, display_name, bio, location, website, avatar_url, category`,
      [display_name, bio, location, website, category||'general', req.user.id]
    );
    res.json({ user: rows[0] });
  } catch { res.status(500).json({ error: 'Error al actualizar perfil' }); }
});

// GET /api/users/:id - buscar por ID (para mensajes)
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, username, display_name, avatar_url, bio, role
       FROM users WHERE id = $1 AND is_active = true`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: rows[0] });
  } catch { res.status(500).json({ error: 'Error' }); }
});

module.exports = router;

// POST /api/users/:id/block
router.post('/:id/block', authenticate, async (req, res) => {
  try {
    const { query } = require('../config/database');
    await query(
      'INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Usuario bloqueado' });
  } catch { res.status(500).json({ error: 'Error al bloquear' }); }
});

// DELETE /api/users/:id/block
router.delete('/:id/block', authenticate, async (req, res) => {
  try {
    const { query } = require('../config/database');
    await query('DELETE FROM blocked_users WHERE blocker_id=$1 AND blocked_id=$2', [req.user.id, req.params.id]);
    res.json({ message: 'Usuario desbloqueado' });
  } catch { res.status(500).json({ error: 'Error' }); }
});

// GET /api/users/blocked/list
router.get('/blocked/list', authenticate, async (req, res) => {
  try {
    const { query } = require('../config/database');
    const { rows } = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, b.created_at as blocked_at
       FROM blocked_users b JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1 ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ blocked: rows });
  } catch { res.status(500).json({ error: 'Error' }); }
});

// PUT /api/users/me/password — cambiar contraseña
router.put('/me/password', authenticate, async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { query } = require('../config/database');
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener mínimo 8 caracteres' });
    }

    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const newHash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

// DELETE /api/users/me — eliminar cuenta
router.delete('/me', authenticate, async (req, res) => {
  try {
    const { query } = require('../config/database');
    await query('UPDATE users SET is_active = false, email = email || \'_deleted_\' || NOW()::text WHERE id = $1', [req.user.id]);
    res.json({ message: 'Cuenta eliminada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar cuenta' });
  }
});
