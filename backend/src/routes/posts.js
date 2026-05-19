const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, requireCreator, optionalAuth } = require('../middleware/auth');

// PRIMERO - GET /api/posts/creator/me
router.get('/creator/me', authenticate, requireCreator, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const { rows } = await query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url, true as has_access
       FROM posts p JOIN users u ON p.creator_id = u.id
       WHERE p.creator_id = $1
       ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({ posts: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar posts' });
  }
});

// GET /api/posts/feed
router.get('/feed', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { rows } = await query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url, u.is_verified,
              COALESCE(l.user_id IS NOT NULL, false) as is_liked,
              CASE
                WHEN p.is_free = true THEN true
                WHEN s.id IS NOT NULL THEN true
                WHEN pp.id IS NOT NULL THEN true
                ELSE false
              END as has_access
       FROM posts p
       JOIN users u ON p.creator_id = u.id
       LEFT JOIN subscriptions s ON s.fan_id = $1 AND s.creator_id = p.creator_id AND s.status = 'active'
       LEFT JOIN ppv_purchases pp ON pp.fan_id = $1 AND pp.post_id = p.id
       LEFT JOIN likes l ON l.user_id = $1 AND l.post_id = p.id
       WHERE p.is_published = true
         AND p.creator_id IN (
           SELECT creator_id FROM subscriptions WHERE fan_id = $1 AND status = 'active'
         )
       ORDER BY p.published_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    const processed = rows.map(p => ({
      ...p,
      media: p.has_access ? p.media : [],
      body: p.has_access ? p.body : null,
    }));
    res.json({ posts: processed, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar el feed' });
  }
});

// GET /api/posts/creator/:username
router.get('/creator/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const { rows: userRows } = await query(
      'SELECT id FROM users WHERE username = $1 AND is_active = true',
      [username]
    );
    if (!userRows.length) return res.status(404).json({ error: 'Creador no encontrado' });
    const creatorId = userRows[0].id;
    const fanId = req.user?.id;
    const { rows } = await query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url, u.is_verified,
              COALESCE(l.user_id IS NOT NULL, false) as is_liked,
              CASE
                WHEN p.is_free = true THEN true
                -- El mismo creador ve todo su contenido
                WHEN p.creator_id::text = $2::text THEN true
                -- Admin ve todo
                WHEN $2::uuid IS NOT NULL AND EXISTS(SELECT 1 FROM users WHERE id=$2 AND role='admin') THEN true
                -- Fan suscrito activo ve contenido de suscripción
                WHEN $2::uuid IS NOT NULL AND s.id IS NOT NULL THEN true
                -- PPV comprado
                WHEN $2::uuid IS NOT NULL AND pp.id IS NOT NULL THEN true
                -- Otro creador NO ve contenido de pago
                ELSE false
              END as has_access
       FROM posts p
       JOIN users u ON p.creator_id = u.id
       LEFT JOIN subscriptions s ON s.fan_id = $2 AND s.creator_id = p.creator_id AND s.status = 'active'
       LEFT JOIN ppv_purchases pp ON pp.fan_id = $2 AND pp.post_id = p.id
       LEFT JOIN likes l ON l.user_id = $2 AND l.post_id = p.id
       WHERE p.creator_id = $1 AND p.is_published = true
       ORDER BY p.published_at DESC
       LIMIT $3 OFFSET $4`,
      [creatorId, fanId || null, limit, offset]
    );
    res.json({ posts: rows, creatorId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar posts' });
  }
});

// GET /api/posts/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url, u.is_verified,
              CASE
                WHEN p.is_free THEN true
                WHEN p.creator_id::text = $2::text THEN true
                WHEN $2::uuid IS NOT NULL AND s.id IS NOT NULL THEN true
                WHEN $2::uuid IS NOT NULL AND pp.id IS NOT NULL THEN true
                WHEN $2::uuid IS NOT NULL AND EXISTS(SELECT 1 FROM users WHERE id=$2 AND role='admin') THEN true
                ELSE false
              END as has_access
       FROM posts p
       JOIN users u ON p.creator_id = u.id
       LEFT JOIN subscriptions s ON s.fan_id = $2 AND s.creator_id = p.creator_id AND s.status = 'active'
       LEFT JOIN ppv_purchases pp ON pp.fan_id = $2 AND pp.post_id = p.id
       WHERE p.id = $1 AND p.is_published = true`,
      [req.params.id, req.user?.id || null]
    );
    if (!rows.length) return res.status(404).json({ error: 'Post no encontrado' });
    query('UPDATE posts SET view_count = view_count + 1 WHERE id = $1', [req.params.id]).catch(() => {});
    const post = rows[0];
    if (!post.has_access) { post.media = []; post.body = null; }
    res.json({ post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar el post' });
  }
});

// POST /api/posts
router.post('/', authenticate, requireCreator, async (req, res) => {
  try {
    const { title, body, media = [], type = 'post', is_free = false, ppv_price, tier_required, scheduled_at } = req.body;
    if (!body && !media.length) return res.status(400).json({ error: 'El post debe tener texto o media' });
    const isScheduled = scheduled_at && new Date(scheduled_at) > new Date();
    const { rows } = await query(
      `INSERT INTO posts (creator_id, title, body, media, type, is_free, ppv_price, tier_required, scheduled_at, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, title, body, JSON.stringify(media), type, is_free, ppv_price || null, tier_required || null, scheduled_at || null, !isScheduled]
    );
    res.status(201).json({ post: rows[0], message: isScheduled ? 'Post programado' : 'Post publicado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el post' });
  }
});

// PUT /api/posts/:id
router.put('/:id', authenticate, requireCreator, async (req, res) => {
  try {
    const { rows: own } = await query('SELECT id FROM posts WHERE id = $1 AND creator_id = $2', [req.params.id, req.user.id]);
    if (!own.length) return res.status(403).json({ error: 'Sin permiso' });
    const { title, body, is_free, ppv_price } = req.body;
    const { rows } = await query(
      `UPDATE posts SET title=$1, body=$2, is_free=$3, ppv_price=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [title, body, is_free, ppv_price || null, req.params.id]
    );
    res.json({ post: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar post' });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', authenticate, requireCreator, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM posts WHERE id = $1 AND creator_id = $2', [req.params.id, req.user.id]);
    if (!rowCount) return res.status(404).json({ error: 'Post no encontrado' });
    res.json({ message: 'Post eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar post' });
  }
});

// POST /api/posts/:id/like
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const existing = await query('SELECT id FROM likes WHERE user_id=$1 AND post_id=$2', [req.user.id, req.params.id]);
    if (existing.rows.length) {
      await query('DELETE FROM likes WHERE user_id=$1 AND post_id=$2', [req.user.id, req.params.id]);
      await query('UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id=$1', [req.params.id]);
      return res.json({ liked: false });
    }
    await query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [req.user.id, req.params.id]);
    await query('UPDATE posts SET like_count = like_count + 1 WHERE id=$1', [req.params.id]);
    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar like' });
  }
});

// GET /api/posts/:id/comments
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1 AND c.is_deleted = false
       ORDER BY c.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ comments: rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar comentarios' });
  }
});

// POST /api/posts/:id/comments
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Comentario vacío' });
    const { rows } = await query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.user.id, content.trim()]
    );
    await query('UPDATE posts SET comment_count = comment_count + 1 WHERE id=$1', [req.params.id]);
    res.status(201).json({ comment: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error al publicar comentario' });
  }
});

module.exports = router;

// GET /api/posts/stories/feed - historias propias + de creadores suscritos + todos si es fan
router.get('/stories/feed', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url, true as has_access
       FROM posts p
       JOIN users u ON p.creator_id = u.id
       WHERE p.type = 'story'
         AND p.is_published = true
         AND p.published_at >= NOW() - INTERVAL '24 hours'
         AND (
           p.creator_id = $1
           OR p.creator_id IN (
             SELECT creator_id FROM subscriptions
             WHERE fan_id = $1 AND status = 'active'
           )
           OR EXISTS (
             SELECT 1 FROM subscriptions
             WHERE fan_id = $1 AND creator_id = p.creator_id AND status = 'active'
           )
         )
       GROUP BY p.id, u.username, u.display_name, u.avatar_url
       ORDER BY p.published_at DESC`,
      [req.user.id]
    );
    res.json({ stories: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar historias' });
  }
});

// GET /api/posts/stories/creator/:creatorId - historias de un creador específico
router.get('/stories/creator/:creatorId', optionalAuth, async (req, res) => {
  try {
    const viewerId   = req.user?.id;
    const creatorId  = req.params.creatorId;

    // Verificar acceso: propio perfil, admin, o fan suscrito
    let hasAccess = false;
    if (viewerId) {
      if (viewerId === creatorId) {
        hasAccess = true; // es el mismo creador
      } else {
        const { rows: accessRows } = await query(
          `SELECT 1 FROM users WHERE id = $1 AND role = 'admin'
           UNION
           SELECT 1 FROM subscriptions WHERE fan_id = $1 AND creator_id = $2 AND status = 'active'`,
          [viewerId, creatorId]
        );
        hasAccess = accessRows.length > 0;
      }
    }

    if (!hasAccess) {
      return res.json({ stories: [] }); // No mostrar historias sin acceso
    }

    const { rows } = await query(
      `SELECT p.*, u.username, u.display_name, u.avatar_url, true as has_access
       FROM posts p
       JOIN users u ON p.creator_id = u.id
       WHERE p.type = 'story' AND p.is_published = true
         AND p.published_at >= NOW() - INTERVAL '24 hours'
         AND p.creator_id = $1
       ORDER BY p.published_at DESC`,
      [creatorId]
    );
    res.json({ stories: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error' });
  }
});
