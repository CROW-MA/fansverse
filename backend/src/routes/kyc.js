const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const KYC_DIR = path.join(process.env.UPLOAD_PATH || './uploads', 'kyc');
fs.mkdirSync(KYC_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, KYC_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const buildKycUrl = (filename) => {
  const base = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
  return `${base}/uploads/kyc/${filename}`;
};

// POST /api/kyc/submit — enviar documentos
router.post('/submit', authenticate, upload.fields([
  { name: 'document_front', maxCount: 1 },
  { name: 'document_back', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]), async (req, res) => {
  try {
    const { document_type } = req.body;
    if (!req.files?.document_front || !req.files?.selfie) {
      return res.status(400).json({ error: 'Foto del documento y selfie son requeridos' });
    }

    const frontUrl  = buildKycUrl(req.files.document_front[0].filename);
    const backUrl   = req.files.document_back ? buildKycUrl(req.files.document_back[0].filename) : null;
    const selfieUrl = buildKycUrl(req.files.selfie[0].filename);

    await query(
      `INSERT INTO kyc_verifications (user_id, document_type, document_front_url, document_back_url, selfie_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         document_type = $2, document_front_url = $3, document_back_url = $4,
         selfie_url = $5, status = 'pending', submitted_at = NOW()`,
      [req.user.id, document_type || 'cedula', frontUrl, backUrl, selfieUrl]
    );

    res.json({ message: 'Documentos enviados. Revisaremos en 24-48 horas.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al enviar documentos' });
  }
});

// GET /api/kyc/status — ver estado de mi KYC
router.get('/status', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT status, rejection_reason, submitted_at, reviewed_at FROM kyc_verifications WHERE user_id = $1',
      [req.user.id]
    );
    res.json(rows[0] || { status: 'not_submitted' });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

// GET /api/kyc/pending — admin ver pendientes
router.get('/pending', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT k.*, u.username, u.display_name, u.email
       FROM kyc_verifications k JOIN users u ON u.id = k.user_id
       WHERE k.status = 'pending' ORDER BY k.submitted_at ASC`
    );
    res.json({ verifications: rows });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

// PATCH /api/kyc/:id/review — admin aprobar/rechazar
router.patch('/:id/review', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    const { rows } = await query(
      `UPDATE kyc_verifications SET status=$1, rejection_reason=$2, reviewed_by=$3, reviewed_at=NOW()
       WHERE id=$4 RETURNING user_id`,
      [status, rejection_reason || null, req.user.id, req.params.id]
    );
    if (status === 'approved' && rows.length) {
      await query('UPDATE users SET is_verified = true WHERE id = $1', [rows[0].user_id]);
    }
    res.json({ message: `KYC ${status === 'approved' ? 'aprobado' : 'rechazado'}` });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
