require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initSocketIO } = require('./services/socketService');

const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/users');
const creatorRoutes      = require('./routes/creators');
const postRoutes         = require('./routes/posts');
const subscriptionRoutes = require('./routes/subscriptions');
const messageRoutes      = require('./routes/messages');
const payoutRoutes       = require('./routes/payouts');
const paymentRoutes      = require('./routes/payments');
const uploadRoutes       = require('./routes/uploads');
const analyticsRoutes    = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const searchRoutes       = require('./routes/search');

const app = express();
app.set('trust proxy', 1);
app.set('trust proxy', 1);
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }
});
initSocketIO(io);
app.set('io', io);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({
  origin: function(origin, callback) {
    // Permitir cualquier origen en desarrollo, o los dominios específicos
    const allowed = [
      'https://fansverse.site',
      'https://www.fansverse.site',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://192.168.1.250:3001',
    ];
    if (!origin || allowed.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // En producción aceptar todo temporalmente
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Manejar preflight OPTIONS explícitamente
app.options('*', cors());

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

const globalLimiter = rateLimit({ windowMs: 15*60*1000, max: 500 });
const authLimiter   = rateLimit({ windowMs: 15*60*1000, max: 20, message: { error: 'Demasiados intentos.' } });
app.use(globalLimiter);

const uploadsPath = path.resolve(process.env.UPLOAD_PATH || path.join(__dirname, '../uploads'));
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath));

app.get('/health', (req, res) => res.json({ status: 'ok', platform: 'FanVerse', env: process.env.NODE_ENV }));

app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/creators',      creatorRoutes);
app.use('/api/posts',         postRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/payouts',       payoutRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/uploads',       uploadRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search',        searchRoutes);

// Rutas nuevas features
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/kyc',     require('./routes/kyc'));
app.use('/api/tips',    require('./routes/tips'));
app.use('/api/packs',   require('./routes/packs'));

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada', path: req.path }));
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Error interno' : err.message });
});

const PORT = parseInt(process.env.PORT) || 4000;

async function start() {
  try {
    await connectDB();
    console.log('✅ PostgreSQL conectado');
  } catch (err) {
    console.error('❌ PostgreSQL no disponible:', err.message);
    process.exit(1);
  }

  try { await connectRedis(); }
  catch { console.warn('⚠️  Redis no disponible — usando fallback en memoria'); }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 FanVerse API → http://localhost:${PORT}`);
    console.log(`   Env: ${process.env.NODE_ENV} | Frontend: ${process.env.FRONTEND_URL}\n`);
  });
}

start();
module.exports = { app, server, io };

// Nuevas rutas

