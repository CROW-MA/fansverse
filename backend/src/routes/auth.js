require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { set, del } = require('../config/redis');
const { authenticate } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, display_name, role = 'fan', category = 'general', ref } = req.body;

    if (!email || !username || !password) return res.status(400).json({ error: 'Email, usuario y contraseña son requeridos' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' });
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return res.status(400).json({ error: 'Usuario: solo letras, números y _ (3-30 chars)' });

    const existing = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [email.toLowerCase(), username.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ error: 'El email o usuario ya está en uso' });

    const allowedRoles = ['fan', 'creator'];
    const safeRole = allowedRoles.includes(role) ? role : 'fan';
    const password_hash = await bcrypt.hash(password, 12);
    const verifyToken = uuidv4();

    const validCategories = ['general','mujer','hombre','pareja','trans','gay','lesbi','no_binario'];
    const safeCategory = validCategories.includes(category) ? category : 'general';

    const { rows } = await query(
      `INSERT INTO users (email, username, password_hash, display_name, role, category, email_verify_token, email_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false) RETURNING id, email, username, display_name, role, category`,
      [email.toLowerCase(), username.toLowerCase(), password_hash, display_name || username, safeRole, safeCategory, verifyToken]
    );

    const user = rows[0];

    // Registrar referido si viene con código
    if (ref) {
      try {
        const { rows: refUser } = await query('SELECT id FROM users WHERE referral_code = $1', [ref.toUpperCase()]);
        if (refUser.length && refUser[0].id !== user.id) {
          await query(
            'INSERT INTO referrals (referrer_id, referred_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [refUser[0].id, user.id]
          );
        }
      } catch {}
    }

    // Crear puntos iniciales
    try {
      await query('INSERT INTO user_points (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
    } catch {}

    // Email de verificación con bienvenida
    const frontendUrl = process.env.FRONTEND_URL || 'https://fansverse.site';
    const verifyLink = `${frontendUrl}/verify-email?token=${verifyToken}`;
    
    sendEmail({
      to: email,
      subject: '✅ Verifica tu email — FanVerse',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0D0D0F;color:#F0F0F5;padding:2rem;border-radius:12px;">
          <div style="text-align:center;margin-bottom:2rem;">
            <h1 style="font-size:2rem;background:linear-gradient(135deg,#E8365D,#D4A843);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;">FanVerse</h1>
          </div>
          <h2 style="font-size:1.4rem;margin-bottom:1rem;">¡Bienvenido/a, ${display_name || username}! 🎉</h2>
          <p style="color:#9090A0;line-height:1.7;margin-bottom:1.5rem;">
            ${safeRole === 'creator' 
              ? 'Tu cuenta de creador está casi lista. Verifica tu email para empezar a monetizar tu contenido con el 85% para ti.'
              : 'Ya casi estás listo para explorar contenido exclusivo de tus creadores favoritos.'
            }
          </p>
          <div style="text-align:center;margin:2rem 0;">
            <a href="${verifyLink}" style="background:#E8365D;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">
              ✅ Verificar mi email
            </a>
          </div>
          <div style="background:#17171B;border-radius:10px;padding:1.25rem;margin-bottom:1.5rem;">
            <h3 style="color:#D4A843;margin:0 0 0.75rem;">¿Por qué FanVerse?</h3>
            <ul style="color:#9090A0;line-height:2;margin:0;padding-left:1.25rem;">
              <li><strong style="color:#F0F0F5;">85%</strong> de cada pago para ti</li>
              <li>Cobros en <strong style="color:#F0F0F5;">2 horas</strong> a tu cuenta</li>
              <li>Pagos en <strong style="color:#F0F0F5;">Nequi, PSE, Bancolombia</strong></li>
              <li>Lives, historias y PPV incluidos</li>
            </ul>
          </div>
          <p style="color:#606070;font-size:12px;text-align:center;">
            Si no creaste esta cuenta, ignora este email.<br/>
            © 2025 FanVerse · <a href="${frontendUrl}" style="color:#E8365D;">fansverse.site</a>
          </p>
        </div>
      `
    }).catch(console.error);

    res.status(201).json({
      message: 'Cuenta creada. Revisa tu email para verificar tu cuenta antes de iniciar sesión.',
      requiresVerification: true,
      email: user.email
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Error al crear la cuenta' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const { rows } = await query(
      `SELECT id, email, username, password_hash, display_name, role, is_active, email_verified, avatar_url
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (!rows.length) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const user = rows[0];

    if (!user.is_active) return res.status(403).json({ error: 'Cuenta suspendida. Contacta soporte.' });

    // Verificar email obligatorio
    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Debes verificar tu email antes de iniciar sesión.',
        requiresVerification: true,
        email: user.email
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const { accessToken, refreshToken } = generateTokens(user.id);
    await set(`refresh:${user.id}`, refreshToken, 30 * 24 * 3600);

    delete user.password_hash;
    res.json({ message: 'Login exitoso', user, accessToken, refreshToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token requerido' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') throw new Error('Token inválido');
    await del(`refresh:${decoded.userId}`);
    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId);
    await set(`refresh:${decoded.userId}`, newRefresh, 30 * 24 * 3600);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await set(`blacklist:${req.token}`, '1', 15 * 60);
    await del(`refresh:${req.user.id}`);
    res.json({ message: 'Sesión cerrada' });
  } catch {
    res.json({ message: 'Sesión cerrada' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await query(
    `SELECT id, email, username, display_name, bio, avatar_url, banner_url, role,
            is_verified, email_verified, location, website, social_links,
            total_earnings, available_balance, pending_balance, total_subscribers, created_at
     FROM users WHERE id = $1`,
    [req.user.id]
  );
  res.json({ user: rows[0] });
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    const { rows } = await query(
      'UPDATE users SET email_verified = TRUE, email_verify_token = NULL WHERE email_verify_token = $1 RETURNING id, username',
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'Token inválido o ya usado' });
    res.json({ message: '¡Email verificado! Ya puedes iniciar sesión.', verified: true });
  } catch {
    res.status(500).json({ error: 'Error al verificar email' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await query('SELECT id, username, email_verified FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows.length) return res.json({ message: 'Si el email existe recibirás el correo' });
    if (rows[0].email_verified) return res.status(400).json({ error: 'Este email ya está verificado' });

    const verifyToken = uuidv4();
    await query('UPDATE users SET email_verify_token = $1 WHERE id = $2', [verifyToken, rows[0].id]);

    sendEmail({
      to: email,
      subject: '✅ Verifica tu email — FanVerse',
      template: 'verify',
      data: { username: rows[0].username, verifyToken, frontendUrl: process.env.FRONTEND_URL }
    }).catch(console.error);

    res.json({ message: 'Email de verificación reenviado' });
  } catch {
    res.status(500).json({ error: 'Error al reenviar email' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await query('SELECT id, username FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows.length) return res.json({ message: 'Si el email existe recibirás instrucciones' });

    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000);
    await query('UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3', [token, expires, rows[0].id]);

    sendEmail({
      to: email,
      subject: '🔐 Restablecer contraseña — FanVerse',
      template: 'reset',
      data: { username: rows[0].username, token, frontendUrl: process.env.FRONTEND_URL }
    }).catch(console.error);

    res.json({ message: 'Si el email existe recibirás instrucciones' });
  } catch {
    res.status(500).json({ error: 'Error al procesar solicitud' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) return res.status(400).json({ error: 'Token y contraseña válida requeridos' });
    const { rows } = await query('SELECT id FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]);
    if (!rows.length) return res.status(400).json({ error: 'Token inválido o expirado' });
    const hash = await bcrypt.hash(password, 12);
    await query('UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2', [hash, rows[0].id]);
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch {
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
});

module.exports = router;
