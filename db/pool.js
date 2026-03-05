/**
 * Database pool singleton. Create once from config, export for use by routes and services.
 */
const { Pool } = require('pg');
const config = require('../config');

let pool = null;

function getPool() {
  if (pool) return pool;
  if (!config.database.url) return null;
  pool = new Pool({
    connectionString: config.database.url,
    connectionTimeoutMillis: 10000,
    ...(config.database.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
  });
  return pool;
}

/**
 * Call after getPool() to verify schema exists (e.g. users table). Returns true if DB is usable.
 */
async function isSchemaReady(p) {
  if (!p) return false;
  try {
    const r = await p.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1"
    );
    return r.rows.length > 0;
  } catch (e) {
    return false;
  }
}

module.exports = { getPool, isSchemaReady };
