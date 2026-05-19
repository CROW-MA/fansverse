const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp    = require('sharp');
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const UPLOAD_DIR = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');

['images','videos','audio','thumbnails','avatars','banners'].forEach(dir => {
  fs.mkdirSync(path.join(UPLOAD_DIR, dir), { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = file.mimetype.startsWith('image/') ? 'images'
      : file.mimetype.startsWith('video/') ? 'videos'
      : file.mimetype.startsWith('audio/') ? 'audio' : 'images';
    req.fileType = type;
    cb(null, path.join(UPLOAD_DIR, type));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/quicktime','video/webm','video/x-msvideo',
    'audio/mpeg','audio/wav','audio/ogg','audio/mp4'
  ];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Tipo de archivo no permitido'));
};

const upload = multer({
  storage, fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || 500) * 1024 * 1024 }
});

const buildUrl = (filename, type) => {
  const base = process.env.API_URL || process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 4000}`;
  // En producción siempre usar API_URL
  const apiBase = process.env.NODE_ENV === 'production' 
    ? (process.env.API_URL || base)
    : `http://localhost:${process.env.PORT || 4000}`;
  return `${apiBase}/uploads/${type}/${filename}`;
};

// Generar thumbnail de video con ffmpeg
const generateVideoThumb = (videoPath, thumbDir, thumbFilename) => {
  return new Promise((resolve, reject) => {
    try {
      const ffmpeg = require('fluent-ffmpeg');
      // Decirle explícitamente dónde está ffmpeg
      ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
      ffmpeg.setFfprobePath('/usr/bin/ffprobe');

      ffmpeg(videoPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .screenshots({
          timestamps: ['00:00:01'],
          filename: thumbFilename,
          folder: thumbDir,
          size: '640x360'
        });
    } catch (err) {
      reject(err);
    }
  });
};


// Agregar marca de agua con nombre del fan
const addWatermark = async (imagePath, fanUsername) => {
  try {
    const { createCanvas, loadImage } = require('canvas');
    // Si no tiene canvas, usar sharp con texto
    const img = sharp(imagePath);
    const meta = await img.metadata();
    const svgText = `<svg width="${meta.width}" height="${meta.height}">
      <style>.wm { fill: rgba(255,255,255,0.25); font-size: ${Math.max(16, meta.width * 0.025)}px; font-family: Arial; }</style>
      <text class="wm" x="50%" y="95%" text-anchor="middle" transform="rotate(-20, ${meta.width/2}, ${meta.height/2})">
        @fansverse.site · ${fanUsername}
      </text>
    </svg>`;
    const watermarked = imagePath.replace(/(\.\w+)$/, '_wm$1');
    await img.composite([{ input: Buffer.from(svgText), gravity: 'center' }]).toFile(watermarked);
    return watermarked;
  } catch { return imagePath; }
};

// POST /api/uploads/image
router.post('/image', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se proporcionó imagen' });

    const thumbName = `thumb_${req.file.filename.replace(/\.[^.]+$/, '.webp')}`;
    const thumbPath = path.join(UPLOAD_DIR, 'thumbnails', thumbName);

    await sharp(req.file.path)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbPath);

    const { rows } = await query(
      `INSERT INTO media_files (uploader_id, filename, original_name, mime_type, size_bytes, url, thumbnail_url, storage_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'local') RETURNING *`,
      [req.user.id, req.file.filename, req.file.originalname, req.file.mimetype,
       req.file.size, buildUrl(req.file.filename,'images'), buildUrl(thumbName,'thumbnails')]
    );

    res.json({ file: rows[0], url: rows[0].url, thumbnail_url: rows[0].thumbnail_url });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// POST /api/uploads/video
router.post('/video', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se proporcionó video' });

    const videoUrl    = buildUrl(req.file.filename, 'videos');
    const thumbName   = `thumb_${path.basename(req.file.filename, path.extname(req.file.filename))}.jpg`;
    const thumbDir    = path.join(UPLOAD_DIR, 'thumbnails');
    const thumbPath   = path.join(thumbDir, thumbName);
    let   thumbnailUrl = null;

    try {
      await generateVideoThumb(req.file.path, thumbDir, thumbName);
      if (fs.existsSync(thumbPath)) {
        thumbnailUrl = buildUrl(thumbName, 'thumbnails');
        console.log('✅ Thumbnail video generado:', thumbName);
      }
    } catch (ffErr) {
      console.warn('⚠️ Error generando thumbnail:', ffErr.message);
    }

    const { rows } = await query(
      `INSERT INTO media_files (uploader_id, filename, original_name, mime_type, size_bytes, url, thumbnail_url, storage_type, is_processed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'local',true) RETURNING *`,
      [req.user.id, req.file.filename, req.file.originalname, req.file.mimetype,
       req.file.size, videoUrl, thumbnailUrl]
    );

    res.json({ file: rows[0], url: rows[0].url, thumbnail_url: thumbnailUrl });
  } catch (err) {
    console.error('Video upload error:', err);
    res.status(500).json({ error: 'Error al subir video' });
  }
});

// POST /api/uploads/avatar
router.post('/avatar', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se proporcionó imagen' });

    const avatarName = `avatar_${req.user.id}.webp`;
    const avatarPath = path.join(UPLOAD_DIR, 'avatars', avatarName);

    await sharp(req.file.path)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(avatarPath);

    fs.unlink(req.file.path, () => {});

    const avatarUrl = buildUrl(avatarName, 'avatars');
    await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.user.id]);

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error('Avatar error:', err);
    res.status(500).json({ error: 'Error al subir avatar' });
  }
});

// POST /api/uploads/banner
router.post('/banner', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se proporcionó imagen' });

    const bannerName = `banner_${req.user.id}.webp`;
    const bannerPath = path.join(UPLOAD_DIR, 'banners', bannerName);

    const posY = Math.max(0, Math.min(100, parseInt(req.body.posY || 50)));
    const TARGET_W = 1200;
    const TARGET_H = 350;

    // Paso 1: escalar manteniendo ancho de 1200px
    const meta = await sharp(req.file.path).metadata();
    const scaleRatio = TARGET_W / meta.width;
    const scaledH = Math.round(meta.height * scaleRatio);

    // Paso 2: si la imagen escalada es más alta que el target, recortar
    if (scaledH > TARGET_H) {
      const maxTop = scaledH - TARGET_H;
      const top = Math.round(maxTop * (posY / 100));
      await sharp(req.file.path)
        .resize(TARGET_W, scaledH)
        .extract({ left: 0, top: top, width: TARGET_W, height: TARGET_H })
        .webp({ quality: 85 })
        .toFile(bannerPath);
    } else {
      // La imagen es más baja que el target — extender con fondo negro
      await sharp(req.file.path)
        .resize(TARGET_W, TARGET_H, { fit: 'contain', background: { r:13, g:13, b:15 } })
        .webp({ quality: 85 })
        .toFile(bannerPath);
    }

    fs.unlink(req.file.path, () => {});

    const bannerUrl = buildUrl(bannerName, 'banners');
    await query('UPDATE users SET banner_url = $1 WHERE id = $2', [bannerUrl, req.user.id]);

    res.json({ banner_url: bannerUrl });
  } catch (err) {
    console.error('Banner error:', err);
    res.status(500).json({ error: 'Error al subir banner' });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: `Archivo demasiado grande. Máximo ${process.env.MAX_FILE_SIZE_MB||500}MB` });
  }
  if (err.message === 'Tipo de archivo no permitido') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
