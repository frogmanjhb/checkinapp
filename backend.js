require('dotenv').config();
const log = (...args) => { process.stderr.write(args.join(' ') + '\n'); };
log('Starting backend...');

const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const pgSession = require('connect-pg-simple');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { getPool, isSchemaReady } = require('./db/pool');
const settings = require('./services/settings');
const housePoints = require('./services/house-points');
const { createAuthRouter } = require('./routes/auth');
const { createCheckinsRouter } = require('./routes/checkins');
const { createTilesRouter } = require('./routes/tiles');
const { createMessagesRouter } = require('./routes/messages');
const { createDirectorRouter } = require('./routes/director');

const app = express();
const PORT = config.port;

app.set('trust proxy', 1);

if (config.nodeEnv === 'production' && !config.session.secret) {
  log('⚠️ SESSION_SECRET should be set in production');
}

const corsOptions = config.cors.isCrossOrigin
  ? { origin: config.cors.frontendOrigin, credentials: true }
  : { origin: true, credentials: true };

const pool = getPool();
log('🔍 Database URL:', config.database.url ? 'Found' : 'Not found');
log('🔍 NODE_ENV:', config.nodeEnv);

if (pool) {
  pool.on('connect', () => log('✅ Connected to PostgreSQL database'));
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.use(cookieParser());

const sessionCookie = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: config.nodeEnv === 'production' && config.cors.isCrossOrigin ? 'none' : 'lax',
  maxAge: config.session.cookieMaxAge,
};

const sessionStore = pool ? new (pgSession(session))({ pool, createTableIfMissing: true }) : undefined;
app.use(session({
  secret: config.session.secret || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  name: 'checkin.sid',
  cookie: sessionCookie,
}));
app.use(express.json());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { success: false, error: 'Too many attempts' } });
const messageLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { success: false, error: 'Too many messages' } });

app.use((req, res, next) => {
  if (req.url.endsWith('.css') || req.url.endsWith('.js') || req.url.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// API: mount feature routers under /api (paths preserved: /api/register, /api/director/settings, etc.)
app.use('/api', createAuthRouter({ pool, config, authLimiter }));
app.use('/api', createCheckinsRouter({ pool, settings, housePoints }));
app.use('/api', createTilesRouter({ pool, housePoints }));
app.use('/api', createMessagesRouter({ pool, settings, config, messageLimiter }));
app.use('/api', createDirectorRouter({ pool, settings }));

// Serve flag keywords JSON for client-side flagging (avoids static path issues)
app.get('/api/flag-keywords', (req, res) => {
  const candidates = [
    path.join(__dirname, 'public', 'data', 'flagKeywords.json'),
    path.join(__dirname, 'data', 'flagKeywords.json')
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        const json = JSON.parse(data);
        return res.type('application/json').json(json);
      }
    } catch (err) {
      continue;
    }
  }
  res.status(404).json({ red: {}, amber: {}, yellow: {} });
});

// Serve static files from public only (no exposure of server code or .env)
app.use(express.static(path.join(__dirname, 'public')));

// Handle all other routes by serving index.html (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/** Create demo director and teacher when demo.enabled and they do not exist. */
async function ensureDemoUsers(p, cfg) {
  if (!p || !cfg.demo.enabled) return;
  try {
    const directorExists = await p.query('SELECT id FROM users WHERE email = $1', [cfg.demo.directorEmail]);
    if (directorExists.rows.length === 0) {
      const hash = await bcrypt.hash(cfg.demo.directorPassword, 10);
      await p.query(
        `INSERT INTO users (first_name, surname, email, password_hash, user_type) VALUES ($1, $2, $3, $4, $5)`,
        ['Jat', 'Lee', cfg.demo.directorEmail, hash, 'director']
      );
      log('✅ Demo director user created');
    }
    const teacherExists = await p.query('SELECT id FROM users WHERE email = $1', [cfg.demo.teacherEmail]);
    if (teacherExists.rows.length === 0) {
      const hash = await bcrypt.hash(cfg.demo.teacherPassword, 10);
      const teacherResult = await p.query(
        `INSERT INTO users (first_name, surname, email, password_hash, user_type, class, house)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        ['Demo', 'Teacher', cfg.demo.teacherEmail, hash, 'teacher', 'Grade 6', 'Mirfield']
      );
      const teacherId = teacherResult.rows[0].id;
      await p.query(
        `INSERT INTO teacher_assignments (teacher_id, grade, house) VALUES ($1, $2, $3), ($1, $4, $5), ($1, $6, $7)`,
        [teacherId, 'Grade 5', 'Mirfield', 'Grade 6', 'Mirfield', 'Grade 7', 'Mirfield']
      );
      log('✅ Demo teacher user created');
    }
  } catch (err) {
    log('⚠️ Demo user creation failed:', err.message);
  }
}

async function startServer() {
  try {
    if (config.database.url) {
      const ready = await isSchemaReady(pool);
      if (!ready) {
        log('❌ Database schema not ready. Run: npm run migrate');
        process.exit(1);
      }
      await ensureDemoUsers(pool, config);
    }

    log(`Binding to port ${PORT}...`);
    app.listen(PORT, () => {
      log(`🚀 Server running on port ${PORT}`);
      log(`📱 Open http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
