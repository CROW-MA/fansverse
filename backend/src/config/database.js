const { Pool } = require('pg');

let pool;

const connectDB = async () => {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'fanverse_db',
    user: process.env.DB_USER || 'fanverse_user',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => {
    console.error('❌ PostgreSQL error inesperado:', err);
  });

  await pool.query('SELECT NOW()');
  return pool;
};

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn('⚠️ Query lenta:', { text: text.substring(0, 80), duration });
    }
    return res;
  } catch (err) {
    console.error('❌ DB Query error:', { text: text.substring(0, 80), error: err.message });
    throw err;
  }
};

const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const release = client.release.bind(client);
  client.release = () => {
    client.query = originalQuery;
    client.release = release;
    return release();
  };
  return client;
};

// Transaction helper
const withTransaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { connectDB, query, getClient, withTransaction };
