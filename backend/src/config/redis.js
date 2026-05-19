let client = null;
let connected = false;
const memStore = new Map();

const connectRedis = async () => {
  try {
    const { createClient } = require('redis');
    client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    client.on('error', () => {});
    await client.connect();
    connected = true;
    console.log('✅ Redis conectado');
  } catch {
    console.warn('⚠️  Redis no disponible — usando memoria interna');
    connected = false;
  }
};

const get = async (key) => {
  if (connected && client) { try { return await client.get(key); } catch {} }
  return memStore.get(key) || null;
};
const set = async (key, value, ttl = 3600) => {
  const v = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (connected && client) { try { await client.setEx(key, ttl, v); return; } catch {} }
  memStore.set(key, v);
  setTimeout(() => memStore.delete(key), ttl * 1000);
};
const del = async (key) => {
  if (connected && client) { try { await client.del(key); } catch {} }
  memStore.delete(key);
};
const getJSON = async (key) => {
  const v = await get(key); if (!v) return null;
  try { return JSON.parse(v); } catch { return v; }
};
const setJSON = (key, value, ttl = 3600) => set(key, value, ttl);
const invalidatePattern = async () => {};

module.exports = { connectRedis, get, set, del, getJSON, setJSON, invalidatePattern };
