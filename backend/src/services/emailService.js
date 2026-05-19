const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
};

const templates = {
  verify: ({ username, verifyToken, frontendUrl }) => ({
    subject: '✅ Verifica tu email - FanVerse',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0D0D0F;color:#F5F5F7;padding:2rem;border-radius:12px;">
        <h1 style="color:#E8365D;font-size:1.5rem;">FanVerse</h1>
        <h2>¡Bienvenido, ${username}!</h2>
        <p style="color:#A0A0A8;">Verifica tu email para activar tu cuenta.</p>
        <a href="${frontendUrl}/verify-email?token=${verifyToken}"
           style="display:inline-block;background:#E8365D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:1rem 0;">
          Verificar Email
        </a>
        <p style="color:#606068;font-size:12px;">El enlace expira en 24 horas.</p>
      </div>`
  }),
  reset: ({ username, token, frontendUrl }) => ({
    subject: '🔐 Restablecer contraseña - FanVerse',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0D0D0F;color:#F5F5F7;padding:2rem;border-radius:12px;">
        <h1 style="color:#E8365D;">FanVerse</h1>
        <h2>Restablecer contraseña</h2>
        <p style="color:#A0A0A8;">Hola ${username}, solicitaste restablecer tu contraseña.</p>
        <a href="${frontendUrl}/reset-password?token=${token}"
           style="display:inline-block;background:#E8365D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:1rem 0;">
          Restablecer Contraseña
        </a>
        <p style="color:#606068;font-size:12px;">El enlace expira en 1 hora. Si no solicitaste esto, ignora este email.</p>
      </div>`
  }),
  payout_completed: ({ username, amount, method }) => ({
    subject: '💸 Retiro completado - FanVerse',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0D0D0F;color:#F5F5F7;padding:2rem;border-radius:12px;">
        <h1 style="color:#E8365D;">FanVerse</h1>
        <h2 style="color:#22C55E;">✅ Retiro completado</h2>
        <p>Hola ${username}, tu retiro de <strong style="color:#E8365D;">$${amount}</strong> vía ${method} fue procesado exitosamente.</p>
      </div>`
  })
};

const sendEmail = async ({ to, subject, template, data, html }) => {
  try {
    const transport = getTransporter();
    const tmpl = template && templates[template] ? templates[template](data) : null;

    await transport.sendMail({
      from: process.env.FROM_EMAIL || 'FanVerse <noreply@fanverse.com>',
      to,
      subject: tmpl?.subject || subject,
      html: tmpl?.html || html
    });
  } catch (err) {
    console.error('Email error:', err.message);
    // Don't throw - email failure shouldn't break the app
  }
};

module.exports = { sendEmail };
