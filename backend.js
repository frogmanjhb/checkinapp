require('dotenv').config();
// Use stderr so startup logs show immediately (stdout can be buffered when not a TTY)
const log = (...args) => { process.stderr.write(args.join(' ') + '\n'); };
log('Starting backend...');
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
log('🔍 Database URL:', dbUrl ? 'Found' : 'Not found');
log('🔍 NODE_ENV:', process.env.NODE_ENV);

let pool = null;
if (dbUrl) {
  const sslEnabledEnv = (process.env.DATABASE_SSL || '').toLowerCase();
  const useSsl = sslEnabledEnv ? sslEnabledEnv !== 'false' : true; // default keeps existing behavior

  pool = new Pool({
    connectionString: dbUrl,
    connectionTimeoutMillis: 10000,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
  });
} else {
  log('⚠️ No database URL found - running without database');
}

// Test database connection
if (pool) {
  pool.on('connect', () => {
    log('✅ Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
  });
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for your app
}));
app.use(cors());
app.use(express.json());

// Cache control headers to prevent caching during development
app.use((req, res, next) => {
  if (req.url.endsWith('.css') || req.url.endsWith('.js') || req.url.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Initialize database tables
async function initializeDatabase() {
  if (!pool) {
    console.log('⚠️ No database connection - skipping initialization');
    return;
  }
  
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        surname VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'teacher', 'director')),
        class VARCHAR(20),
        house VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create teacher_assignments table for multiple grade/house assignments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_assignments (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        grade VARCHAR(20),
        house VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(teacher_id, grade, house)
      )
    `);

    // Update existing constraint to include 'director' (simple approach that works)
    try {
      await pool.query(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check
      `);
      await pool.query(`
        ALTER TABLE users ADD CONSTRAINT users_user_type_check 
        CHECK (user_type IN ('student', 'teacher', 'director'))
      `);
      console.log('✅ Updated user_type constraint to include director');
    } catch (error) {
      console.log('⚠️ Constraint update failed (may already be correct):', error.message);
    }

    // Create mood check-ins table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mood_checkins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        mood VARCHAR(20) NOT NULL,
        emoji VARCHAR(10) NOT NULL,
        notes TEXT,
        location VARCHAR(50),
        reasons TEXT[],
        emotions TEXT[],
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create journal entries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        entry TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        thread_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for messages
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_to_user_id ON messages(to_user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_from_user_id ON messages(from_user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mood_checkins_user_id ON mood_checkins(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mood_checkins_timestamp ON mood_checkins(timestamp)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_journal_entries_timestamp ON journal_entries(timestamp)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type)
    `);

    // App settings (plugins, feature flags)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      INSERT INTO app_settings (key, value) VALUES ('message_center_enabled', 'true')
      ON CONFLICT (key) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO app_settings (key, value) VALUES ('ghost_mode_enabled', 'true')
      ON CONFLICT (key) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO app_settings (key, value) VALUES ('tile_flip_enabled', 'true')
      ON CONFLICT (key) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO app_settings (key, value) VALUES ('house_points_enabled', 'true')
      ON CONFLICT (key) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO app_settings (key, value) VALUES ('max_checkins_per_day', '1')
      ON CONFLICT (key) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO app_settings (key, value) VALUES ('max_journal_entries_per_day', '1')
      ON CONFLICT (key) DO NOTHING
    `);
    // Initialize default class names
    const defaultClassNames = ['5EF', '5AM', '5JS', '6A', '6B', '6C', '7A', '7B', '7C'];
    await pool.query(`
      INSERT INTO app_settings (key, value) VALUES ('class_names', $1)
      ON CONFLICT (key) DO NOTHING
    `, [JSON.stringify(defaultClassNames)]);
    console.log('✅ app_settings initialized');

    // Create tile_flips table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tile_flips (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tile_index INTEGER NOT NULL CHECK (tile_index >= 0 AND tile_index <= 11),
        quote_index INTEGER NOT NULL CHECK (quote_index >= 0 AND quote_index <= 49),
        flipped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, tile_index)
      )
    `);

    // Create tile_quotes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tile_quotes (
        id SERIAL PRIMARY KEY,
        quote_index INTEGER NOT NULL UNIQUE CHECK (quote_index >= 0 AND quote_index <= 49),
        quote_text TEXT NOT NULL,
        author VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tile_flip_resets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tile_flip_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        next_quote_index INTEGER DEFAULT 0 CHECK (next_quote_index >= 0 AND next_quote_index <= 49),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    // Create indexes for tile_flips
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tile_flips_user_id ON tile_flips(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tile_flips_tile_index ON tile_flips(tile_index)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tile_flip_resets_user_id ON tile_flip_resets(user_id)
    `);

    // Create house_points table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS house_points (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        points INTEGER NOT NULL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    // Create index for house_points
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_house_points_user_id ON house_points(user_id)
    `);

    // Seed 50 inspirational quotes
    const quotes = [
      { quote_index: 0, quote_text: "You are braver than you believe, stronger than you seem, and smarter than you think.", author: "A.A. Milne" },
      { quote_index: 1, quote_text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
      { quote_index: 2, quote_text: "Every accomplishment starts with the decision to try.", author: "Unknown" },
      { quote_index: 3, quote_text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
      { quote_index: 4, quote_text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { quote_index: 5, quote_text: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden" },
      { quote_index: 6, quote_text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
      { quote_index: 7, quote_text: "It's okay to not know, but it's not okay to not try.", author: "Unknown" },
      { quote_index: 8, quote_text: "You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose.", author: "Dr. Seuss" },
      { quote_index: 9, quote_text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
      { quote_index: 10, quote_text: "Mistakes are proof that you are trying.", author: "Unknown" },
      { quote_index: 11, quote_text: "You are capable of amazing things.", author: "Unknown" },
      { quote_index: 12, quote_text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
      { quote_index: 13, quote_text: "The only person you should try to be better than is the person you were yesterday.", author: "Unknown" },
      { quote_index: 14, quote_text: "Dream big and dare to fail.", author: "Norman Vaughan" },
      { quote_index: 15, quote_text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
      { quote_index: 16, quote_text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" },
      { quote_index: 17, quote_text: "In a world where you can be anything, be kind.", author: "Unknown" },
      { quote_index: 18, quote_text: "Your limitation—it's only your imagination.", author: "Unknown" },
      { quote_index: 19, quote_text: "Great things never come from comfort zones.", author: "Unknown" },
      { quote_index: 20, quote_text: "Dream it. Wish it. Do it.", author: "Unknown" },
      { quote_index: 21, quote_text: "Success doesn't come from what you do occasionally. It comes from what you do consistently.", author: "Unknown" },
      { quote_index: 22, quote_text: "Don't wait for opportunity. Create it.", author: "Unknown" },
      { quote_index: 23, quote_text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
      { quote_index: 24, quote_text: "You don't have to be perfect to be amazing.", author: "Unknown" },
      { quote_index: 25, quote_text: "Your attitude determines your direction.", author: "Unknown" },
      { quote_index: 26, quote_text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
      { quote_index: 27, quote_text: "Progress, not perfection.", author: "Unknown" },
      { quote_index: 28, quote_text: "You are stronger than you think.", author: "Unknown" },
      { quote_index: 29, quote_text: "Today is your opportunity to build the tomorrow you want.", author: "Ken Poirot" },
      { quote_index: 30, quote_text: "When you know better, you do better.", author: "Maya Angelou" },
      { quote_index: 31, quote_text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
      { quote_index: 32, quote_text: "You are enough just as you are.", author: "Unknown" },
      { quote_index: 33, quote_text: "Every expert was once a beginner. Every pro was once an amateur.", author: "Unknown" },
      { quote_index: 34, quote_text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
      { quote_index: 35, quote_text: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
      { quote_index: 36, quote_text: "You learn more from failure than from success.", author: "Unknown" },
      { quote_index: 37, quote_text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
      { quote_index: 38, quote_text: "The only way to have a friend is to be one.", author: "Ralph Waldo Emerson" },
      { quote_index: 39, quote_text: "Be curious, not judgmental.", author: "Walt Whitman" },
      { quote_index: 40, quote_text: "You can't use up creativity. The more you use, the more you have.", author: "Maya Angelou" },
      { quote_index: 41, quote_text: "Think big thoughts but relish small pleasures.", author: "H. Jackson Brown Jr." },
      { quote_index: 42, quote_text: "It's not about being the best. It's about being better than you were yesterday.", author: "Unknown" },
      { quote_index: 43, quote_text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss" },
      { quote_index: 44, quote_text: "You have to be odd to be number one.", author: "Dr. Seuss" },
      { quote_index: 45, quote_text: "Today you are you, that is truer than true. There is no one alive who is youer than you.", author: "Dr. Seuss" },
      { quote_index: 46, quote_text: "Why fit in when you were born to stand out?", author: "Dr. Seuss" },
      { quote_index: 47, quote_text: "A person's a person, no matter how small.", author: "Dr. Seuss" },
      { quote_index: 48, quote_text: "The more you give away, the happier you become.", author: "Unknown" },
      { quote_index: 49, quote_text: "You are today where your thoughts have brought you. You will be tomorrow where your thoughts take you.", author: "James Allen" }
    ];

    for (const quote of quotes) {
      await pool.query(`
        INSERT INTO tile_quotes (quote_index, quote_text, author)
        VALUES ($1, $2, $3)
        ON CONFLICT (quote_index) DO UPDATE
        SET quote_text = EXCLUDED.quote_text, author = EXCLUDED.author, updated_at = CURRENT_TIMESTAMP
      `, [quote.quote_index, quote.quote_text, quote.author]);
    }
    console.log('✅ Tile flip tables initialized and quotes seeded');

    console.log('✅ Database tables initialized successfully');

    // Add director user if it doesn't exist
    const directorExists = await pool.query('SELECT id FROM users WHERE email = $1', ['jatlee@stpeters.co.za']);
    if (directorExists.rows.length === 0) {
      try {
        const hashedPassword = await bcrypt.hash('director123!', 10);
        await pool.query(`
          INSERT INTO users (first_name, surname, email, password_hash, user_type)
          VALUES ($1, $2, $3, $4, $5)
        `, ['Jat', 'Lee', 'jatlee@stpeters.co.za', hashedPassword, 'director']);
        console.log('✅ Director user created');
      } catch (error) {
        console.log('⚠️ Director user creation failed:', error.message);
      }
    } else {
      console.log('✅ Director user already exists');
    }

    // Add demo teacher user if it doesn't exist
    const teacherExists = await pool.query('SELECT id FROM users WHERE email = $1', ['teacher@stpeters.co.za']);
    if (teacherExists.rows.length === 0) {
      try {
        const hashedPassword = await bcrypt.hash('teacher123!', 10);
        const teacherResult = await pool.query(`
          INSERT INTO users (first_name, surname, email, password_hash, user_type, class, house)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, ['Demo', 'Teacher', 'teacher@stpeters.co.za', hashedPassword, 'teacher', 'Grade 6', 'Mirfield']);
        
        const teacherId = teacherResult.rows[0].id;
        
        // Add teacher assignments for multiple grades
        await pool.query(`
          INSERT INTO teacher_assignments (teacher_id, grade, house)
          VALUES ($1, $2, $3), ($1, $4, $5), ($1, $6, $7)
        `, [teacherId, 'Grade 5', 'Mirfield', 'Grade 6', 'Mirfield', 'Grade 7', 'Mirfield']);
        
        console.log('✅ Demo teacher user created with multiple grade assignments');
      } catch (error) {
        console.log('⚠️ Demo teacher user creation failed:', error.message);
      }
    } else {
      console.log('✅ Demo teacher user already exists');
      
      // Ensure teacher has assignments in the new table
      const teacherId = teacherExists.rows[0].id;
      const assignmentsExist = await pool.query('SELECT id FROM teacher_assignments WHERE teacher_id = $1', [teacherId]);
      if (assignmentsExist.rows.length === 0) {
        try {
          await pool.query(`
            INSERT INTO teacher_assignments (teacher_id, grade, house)
            VALUES ($1, $2, $3), ($1, $4, $5), ($1, $6, $7)
          `, [teacherId, 'Grade 5', 'Mirfield', 'Grade 6', 'Mirfield', 'Grade 7', 'Mirfield']);
          console.log('✅ Added teacher assignments for existing demo teacher');
        } catch (error) {
          console.log('⚠️ Failed to add teacher assignments:', error.message);
        }
      }
    }

  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

async function getMessageCenterEnabled() {
  if (!pool) return true;
  try {
    const r = await pool.query(`SELECT value FROM app_settings WHERE key = 'message_center_enabled'`);
    if (!r.rows.length) return true;
    return r.rows[0].value === 'true';
  } catch (e) {
    console.error('getMessageCenterEnabled:', e);
    return true;
  }
}

async function getGhostModeEnabled() {
  if (!pool) return true;
  try {
    const r = await pool.query(`SELECT value FROM app_settings WHERE key = 'ghost_mode_enabled'`);
    if (!r.rows.length) return true;
    return r.rows[0].value === 'true';
  } catch (e) {
    console.error('getGhostModeEnabled:', e);
    return true;
  }
}

async function getTileFlipEnabled() {
  if (!pool) return true;
  try {
    const r = await pool.query(`SELECT value FROM app_settings WHERE key = 'tile_flip_enabled'`);
    if (!r.rows.length) return true;
    return r.rows[0].value === 'true';
  } catch (e) {
    console.error('getTileFlipEnabled:', e);
    return true;
  }
}

async function getHousePointsEnabled() {
  if (!pool) return true;
  try {
    const r = await pool.query(`SELECT value FROM app_settings WHERE key = 'house_points_enabled'`);
    if (!r.rows.length) return true;
    return r.rows[0].value === 'true';
  } catch (e) {
    console.error('getHousePointsEnabled:', e);
    return true;
  }
}

async function getMaxCheckinsPerDay() {
  if (!pool) return 1;
  try {
    const r = await pool.query(`SELECT value FROM app_settings WHERE key = 'max_checkins_per_day'`);
    if (!r.rows.length) return 1;
    const n = parseInt(r.rows[0].value, 10);
    return Number.isNaN(n) || n < 1 ? 1 : Math.min(n, 999);
  } catch (e) {
    console.error('getMaxCheckinsPerDay:', e);
    return 1;
  }
}

async function getMaxJournalEntriesPerDay() {
  if (!pool) return 1;
  try {
    const r = await pool.query(`SELECT value FROM app_settings WHERE key = 'max_journal_entries_per_day'`);
    if (!r.rows.length) return 1;
    const n = parseInt(r.rows[0].value, 10);
    return Number.isNaN(n) || n < 1 ? 1 : Math.min(n, 999);
  } catch (e) {
    console.error('getMaxJournalEntriesPerDay:', e);
    return 1;
  }
}

// Helper function to award house points
async function awardHousePoints(userId, points) {
  if (!pool) return;
  try {
    // Get user's house to ensure they're a student
    const userResult = await pool.query(
      'SELECT house FROM users WHERE id = $1 AND user_type = $2',
      [userId, 'student']
    );
    
    if (userResult.rows.length === 0) {
      return; // Not a student, no points
    }

    // Insert or update house points
    await pool.query(`
      INSERT INTO house_points (user_id, points, last_updated)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        points = house_points.points + $2,
        last_updated = CURRENT_TIMESTAMP
    `, [userId, points]);
  } catch (error) {
    console.error('Error awarding house points:', error);
  }
}

// API Routes

// User registration
app.post('/api/register', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  
  try {
    const { firstName, surname, email, password, userType, class: studentClass, house, grades, registrationPassword } = req.body;
    
    // Validate required fields
    if (!firstName || !surname || !email || !password || !userType) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Validate email format
    if (!email.endsWith('@stpeters.co.za')) {
      return res.status(400).json({ success: false, error: 'Email must be a @stpeters.co.za address' });
    }

    // Validate registration password for teacher and director
    if (userType === 'teacher' || userType === 'director') {
      if (!registrationPassword) {
        return res.status(400).json({ success: false, error: 'Registration password is required for teacher and director accounts' });
      }
      if (registrationPassword !== 'RE@CT2026') {
        return res.status(403).json({ success: false, error: 'Invalid registration password' });
      }
    }

    // Validate teacher-specific fields
    if (userType === 'teacher' && (!grades || !Array.isArray(grades) || grades.length === 0 || !house)) {
      return res.status(400).json({ success: false, error: 'Teachers must specify at least one grade and house assignment' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insert user - use first grade for teachers, class for students
    const userClass = userType === 'teacher' ? grades[0] : studentClass;
    const result = await pool.query(
      'INSERT INTO users (first_name, surname, email, password_hash, user_type, class, house) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, first_name, surname, email, user_type, class, house, created_at',
      [firstName, surname, email, passwordHash, userType, userClass, house]
    );
    
    const userId = result.rows[0].id;
    
    // If teacher, add all grade assignments
    if (userType === 'teacher') {
      for (const grade of grades) {
        await pool.query(
          'INSERT INTO teacher_assignments (teacher_id, grade, house) VALUES ($1, $2, $3)',
          [userId, grade, house]
        );
      }
    }
    
    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get app settings (e.g. plugin toggles) — used by all roles for UI visibility
app.get('/api/settings', async (req, res) => {
  try {
    const [messageCenterEnabled, ghostModeEnabled, tileFlipEnabled, housePointsEnabled] = await Promise.all([
      getMessageCenterEnabled(),
      getGhostModeEnabled(),
      getTileFlipEnabled(),
      getHousePointsEnabled()
    ]);
    res.json({ success: true, messageCenterEnabled, ghostModeEnabled, tileFlipEnabled, housePointsEnabled });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update app settings (director only)
app.put('/api/director/settings', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { directorUserId, messageCenterEnabled, ghostModeEnabled, tileFlipEnabled, housePointsEnabled } = req.body;
    if (directorUserId == null) {
      return res.status(400).json({ success: false, error: 'Missing directorUserId' });
    }
    if (typeof messageCenterEnabled !== 'boolean' && typeof ghostModeEnabled !== 'boolean' && typeof tileFlipEnabled !== 'boolean' && typeof housePointsEnabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'At least one setting must be provided' });
    }
    const check = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND user_type = $2',
      [directorUserId, 'director']
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Only directors can update settings' });
    }
    const out = {};
    if (typeof messageCenterEnabled === 'boolean') {
      const val = messageCenterEnabled ? 'true' : 'false';
      await pool.query(
        `INSERT INTO app_settings (key, value) VALUES ('message_center_enabled', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [val]
      );
      out.messageCenterEnabled = messageCenterEnabled;
    }
    if (typeof ghostModeEnabled === 'boolean') {
      const val = ghostModeEnabled ? 'true' : 'false';
      await pool.query(
        `INSERT INTO app_settings (key, value) VALUES ('ghost_mode_enabled', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [val]
      );
      out.ghostModeEnabled = ghostModeEnabled;
    }
    if (typeof tileFlipEnabled === 'boolean') {
      const val = tileFlipEnabled ? 'true' : 'false';
      await pool.query(
        `INSERT INTO app_settings (key, value) VALUES ('tile_flip_enabled', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [val]
      );
      out.tileFlipEnabled = tileFlipEnabled;
    }
    if (typeof housePointsEnabled === 'boolean') {
      const val = housePointsEnabled ? 'true' : 'false';
      await pool.query(
        `INSERT INTO app_settings (key, value) VALUES ('house_points_enabled', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [val]
      );
      out.housePointsEnabled = housePointsEnabled;
    }
    res.json({ success: true, ...out });
  } catch (error) {
    console.error('Update director settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get check-in and journal limits (director only)
app.get('/api/director/checkin-journal-settings', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { directorUserId } = req.query;
    if (!directorUserId) {
      return res.status(400).json({ success: false, error: 'Missing directorUserId' });
    }
    const check = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND user_type = $2',
      [directorUserId, 'director']
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Only directors can access these settings' });
    }
    const [maxCheckinsPerDay, maxJournalEntriesPerDay] = await Promise.all([
      getMaxCheckinsPerDay(),
      getMaxJournalEntriesPerDay()
    ]);
    res.json({ success: true, maxCheckinsPerDay, maxJournalEntriesPerDay });
  } catch (error) {
    console.error('Get checkin/journal settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update check-in and journal limits (director only)
app.put('/api/director/checkin-journal-settings', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { directorUserId, maxCheckinsPerDay, maxJournalEntriesPerDay } = req.body;
    if (directorUserId == null) {
      return res.status(400).json({ success: false, error: 'Missing directorUserId' });
    }
    const check = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND user_type = $2',
      [directorUserId, 'director']
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Only directors can update these settings' });
    }
    const out = {};
    if (typeof maxCheckinsPerDay === 'number' && maxCheckinsPerDay >= 1) {
      const val = String(Math.min(Math.floor(maxCheckinsPerDay), 999));
      await pool.query(
        `INSERT INTO app_settings (key, value) VALUES ('max_checkins_per_day', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [val]
      );
      out.maxCheckinsPerDay = parseInt(val, 10);
    } else if (typeof maxCheckinsPerDay === 'string' && maxCheckinsPerDay.trim() !== '') {
      const n = Math.min(Math.max(1, parseInt(maxCheckinsPerDay, 10) || 1), 999);
      const val = String(n);
      await pool.query(
        `INSERT INTO app_settings (key, value) VALUES ('max_checkins_per_day', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [val]
      );
      out.maxCheckinsPerDay = n;
    }
    if (typeof maxJournalEntriesPerDay === 'number' && maxJournalEntriesPerDay >= 1) {
      const val = String(Math.min(Math.floor(maxJournalEntriesPerDay), 999));
      await pool.query(
        `INSERT INTO app_settings (key, value) VALUES ('max_journal_entries_per_day', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [val]
      );
      out.maxJournalEntriesPerDay = parseInt(val, 10);
    } else if (typeof maxJournalEntriesPerDay === 'string' && maxJournalEntriesPerDay.trim() !== '') {
      const n = Math.min(Math.max(1, parseInt(maxJournalEntriesPerDay, 10) || 1), 999);
      const val = String(n);
      await pool.query(
        `INSERT INTO app_settings (key, value) VALUES ('max_journal_entries_per_day', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [val]
      );
      out.maxJournalEntriesPerDay = n;
    }
    res.json({ success: true, ...out });
  } catch (error) {
    console.error('Update checkin/journal settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available class names (public endpoint for registration)
app.get('/api/class-names', async (req, res) => {
  try {
    const defaultClassNames = ['5EF', '5AM', '5JS', '6A', '6B', '6C', '7A', '7B', '7C'];
    
    if (!pool) {
      return res.json({ success: true, classNames: defaultClassNames });
    }
    
    const result = await pool.query(`SELECT value FROM app_settings WHERE key = 'class_names'`);
    if (result.rows.length === 0) {
      return res.json({ success: true, classNames: defaultClassNames });
    }
    
    const classNames = JSON.parse(result.rows[0].value);
    res.json({ success: true, classNames: classNames.sort() });
  } catch (error) {
    console.error('Get class names error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a new class name (director only)
app.post('/api/director/class-names', async (req, res) => {
  try {
    const { className, directorUserId } = req.body;
    
    if (!className || !directorUserId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Verify director
    const userResult = await pool.query('SELECT user_type FROM users WHERE id = $1', [directorUserId]);
    if (userResult.rows.length === 0 || userResult.rows[0].user_type !== 'director') {
      return res.status(403).json({ success: false, error: 'Only directors can manage class names' });
    }
    
    // Get current class names
    const defaultClassNames = ['5EF', '5AM', '5JS', '6A', '6B', '6C', '7A', '7B', '7C'];
    let currentClassNames = defaultClassNames;
    
    const result = await pool.query(`SELECT value FROM app_settings WHERE key = 'class_names'`);
    if (result.rows.length > 0) {
      currentClassNames = JSON.parse(result.rows[0].value);
    }
    
    // Check if class name already exists (case-insensitive)
    const normalizedClassName = className.trim().toUpperCase();
    if (currentClassNames.some(c => c.toUpperCase() === normalizedClassName)) {
      return res.status(400).json({ success: false, error: 'Class name already exists' });
    }
    
    // Add new class name
    currentClassNames.push(className.trim());
    currentClassNames.sort();
    
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('class_names', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [JSON.stringify(currentClassNames)]
    );
    
    res.json({ success: true, classNames: currentClassNames });
  } catch (error) {
    console.error('Add class name error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a class name (director only)
app.delete('/api/director/class-names/:className', async (req, res) => {
  try {
    const { className } = req.params;
    const { directorUserId } = req.body;
    
    if (!className || !directorUserId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Verify director
    const userResult = await pool.query('SELECT user_type FROM users WHERE id = $1', [directorUserId]);
    if (userResult.rows.length === 0 || userResult.rows[0].user_type !== 'director') {
      return res.status(403).json({ success: false, error: 'Only directors can manage class names' });
    }
    
    // Get current class names
    const result = await pool.query(`SELECT value FROM app_settings WHERE key = 'class_names'`);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No class names configured' });
    }
    
    let currentClassNames = JSON.parse(result.rows[0].value);
    
    // Remove the class name (case-insensitive match)
    const normalizedClassName = className.trim().toUpperCase();
    const filteredClassNames = currentClassNames.filter(c => c.toUpperCase() !== normalizedClassName);
    
    if (filteredClassNames.length === currentClassNames.length) {
      return res.status(404).json({ success: false, error: 'Class name not found' });
    }
    
    await pool.query(
      `INSERT INTO app_settings (key, value) VALUES ('class_names', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [JSON.stringify(filteredClassNames)]
    );
    
    res.json({ success: true, classNames: filteredClassNames });
  } catch (error) {
    console.error('Delete class name error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a student's class (director only)
app.put('/api/director/student-class/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { className, directorUserId } = req.body;
    
    if (!studentId || !directorUserId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Verify director
    const directorResult = await pool.query('SELECT user_type FROM users WHERE id = $1', [directorUserId]);
    if (directorResult.rows.length === 0 || directorResult.rows[0].user_type !== 'director') {
      return res.status(403).json({ success: false, error: 'Only directors can update student classes' });
    }
    
    // Verify student exists and is a student
    const studentResult = await pool.query('SELECT id, user_type FROM users WHERE id = $1', [studentId]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    if (studentResult.rows[0].user_type !== 'student') {
      return res.status(400).json({ success: false, error: 'User is not a student' });
    }
    
    // Update the student's class
    const updateResult = await pool.query(
      'UPDATE users SET class = $1, updated_at = NOW() WHERE id = $2 RETURNING id, first_name, surname, class, house',
      [className || null, studentId]
    );
    
    res.json({ success: true, student: updateResult.rows[0] });
  } catch (error) {
    console.error('Update student class error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk update student classes (director only)
app.put('/api/director/student-classes', async (req, res) => {
  try {
    const { updates, directorUserId } = req.body;
    
    if (!updates || !Array.isArray(updates) || !directorUserId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Verify director
    const directorResult = await pool.query('SELECT user_type FROM users WHERE id = $1', [directorUserId]);
    if (directorResult.rows.length === 0 || directorResult.rows[0].user_type !== 'director') {
      return res.status(403).json({ success: false, error: 'Only directors can update student classes' });
    }
    
    const results = [];
    for (const update of updates) {
      if (!update.studentId) continue;
      
      const updateResult = await pool.query(
        'UPDATE users SET class = $1, updated_at = NOW() WHERE id = $2 AND user_type = $3 RETURNING id, first_name, surname, class, house',
        [update.className || null, update.studentId, 'student']
      );
      
      if (updateResult.rows.length > 0) {
        results.push(updateResult.rows[0]);
      }
    }
    
    res.json({ success: true, updatedStudents: results, count: results.length });
  } catch (error) {
    console.error('Bulk update student classes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mood check-in (students: limit per day from settings)
app.post('/api/mood-checkin', async (req, res) => {
  try {
    const { userId, mood, emoji, notes, location, reasons, emotions } = req.body;
    
    
    if (!userId || !mood || !emoji) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (pool) {
      const userRow = await pool.query('SELECT user_type FROM users WHERE id = $1', [userId]);
      const isStudent = userRow.rows.length > 0 && userRow.rows[0].user_type === 'student';
      if (isStudent) {
        const maxPerDay = await getMaxCheckinsPerDay();
        const countResult = await pool.query(
          `SELECT COUNT(*)::int AS count FROM mood_checkins
           WHERE user_id = $1 AND timestamp::date = CURRENT_DATE`,
          [userId]
        );
        const count = countResult.rows[0]?.count ?? 0;
        if (count >= maxPerDay) {
          return res.status(400).json({ success: false, error: maxPerDay === 1 ? "You've already checked in today." : `You've reached the daily limit of ${maxPerDay} check-ins.` });
        }
      }
    }

    const result = await pool.query(
      'INSERT INTO mood_checkins (user_id, mood, emoji, notes, location, reasons, emotions) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [userId, mood, emoji, notes, location, reasons || [], emotions || []]
    );
    
    // Award 1 house point for check-in
    await awardHousePoints(userId, 1);
    
    res.status(201).json({ success: true, checkin: result.rows[0] });
  } catch (error) {
    console.error('Mood check-in error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get mood history for a user
app.get('/api/mood-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = 'daily' } = req.query;
    
    let whereClause = 'WHERE user_id = $1';
    let queryParams = [userId];
    
    // Add time filtering based on period
    if (period === 'daily') {
      whereClause += ' AND timestamp >= CURRENT_DATE';
    } else if (period === 'weekly') {
      whereClause += ' AND timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
    } else if (period === 'monthly') {
      whereClause += ' AND timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';
    }
    
    const result = await pool.query(
      `SELECT * FROM mood_checkins ${whereClause} ORDER BY timestamp DESC`,
      queryParams
    );
    
    res.json({ success: true, checkins: result.rows });
  } catch (error) {
    console.error('Mood history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all students (for teacher dashboard)
app.get('/api/students', async (req, res) => {
  try {
    const { class: classFilter, house: houseFilter } = req.query;
    
    let whereClause = 'WHERE user_type = $1';
    let queryParams = ['student'];
    
    if (classFilter) {
      whereClause += ' AND class = $2';
      queryParams.push(classFilter);
    }
    
    if (houseFilter) {
      const paramIndex = queryParams.length + 1;
      whereClause += ` AND house = $${paramIndex}`;
      queryParams.push(houseFilter);
    }
    
    const result = await pool.query(
      `SELECT id, first_name, surname, email, class, house, created_at FROM users ${whereClause} ORDER BY first_name`,
      queryParams
    );
    
    res.json({ success: true, students: result.rows });
  } catch (error) {
    console.error('Students list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get students for specific teacher (based on their grade and house assignment)
app.get('/api/teacher/students/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // First get the teacher's grade and house assignment
    const teacherResult = await pool.query(
      'SELECT class, house FROM users WHERE id = $1 AND user_type = $2',
      [teacherId, 'teacher']
    );
    
    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }
    
    const teacher = teacherResult.rows[0];
    const teacherGrade = teacher.class;
    const teacherHouse = teacher.house;
    
    // Get students from the teacher's assigned grade and house
    const result = await pool.query(
      `SELECT id, first_name, surname, email, class, house, created_at 
       FROM users 
       WHERE user_type = $1 AND class = $2 AND house = $3 
       ORDER BY first_name`,
      ['student', teacherGrade, teacherHouse]
    );
    
    res.json({ success: true, students: result.rows, teacherAssignment: { grade: teacherGrade, house: teacherHouse } });
  } catch (error) {
    console.error('Teacher students list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get teacher assignments (multiple grades/houses)
app.get('/api/teacher/assignments/:teacherId', async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    const result = await pool.query(`
      SELECT grade, house 
      FROM teacher_assignments 
      WHERE teacher_id = $1 
      ORDER BY grade, house
    `, [teacherId]);
    
    res.json({ success: true, assignments: result.rows });
  } catch (error) {
    console.error('Teacher assignments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all mood check-ins (for teacher analytics)
app.get('/api/all-mood-checkins', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    // Add time filtering based on period
    if (period === 'daily') {
      whereClause = 'WHERE timestamp >= CURRENT_DATE';
    } else if (period === 'weekly') {
      whereClause = 'WHERE timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
    } else if (period === 'monthly') {
      whereClause = 'WHERE timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';
    }
    
    const result = await pool.query(
      `SELECT mc.*, u.first_name, u.surname, u.class, u.house 
       FROM mood_checkins mc 
       JOIN users u ON mc.user_id = u.id 
       ${whereClause} 
       ORDER BY mc.timestamp DESC`,
      queryParams
    );
    
    res.json({ success: true, checkins: result.rows });
  } catch (error) {
    console.error('All mood check-ins error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Journal entry endpoints (students: 1 per day)
app.post('/api/journal-entry', async (req, res) => {
  try {
    const { userId, entry } = req.body;
    
    if (!userId || !entry) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (pool) {
      const userRow = await pool.query('SELECT user_type FROM users WHERE id = $1', [userId]);
      const isStudent = userRow.rows.length > 0 && userRow.rows[0].user_type === 'student';
      if (isStudent) {
        const maxPerDay = await getMaxJournalEntriesPerDay();
        const countResult = await pool.query(
          `SELECT COUNT(*)::int AS count FROM journal_entries
           WHERE user_id = $1 AND timestamp::date = CURRENT_DATE`,
          [userId]
        );
        const count = countResult.rows[0]?.count ?? 0;
        if (count >= maxPerDay) {
          return res.status(400).json({ success: false, error: maxPerDay === 1 ? "You've already done your journal entry today." : `You've reached the daily limit of ${maxPerDay} journal entries.` });
        }
      }
    }

    const result = await pool.query(
      'INSERT INTO journal_entries (user_id, entry) VALUES ($1, $2) RETURNING *',
      [userId, entry]
    );
    
    // Award 2 house points for journal entry
    await awardHousePoints(userId, 2);
    
    res.status(201).json({ success: true, journalEntry: result.rows[0] });
  } catch (error) {
    console.error('Journal entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/journal-entries/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = 'daily' } = req.query;
    
    let whereClause = 'WHERE user_id = $1';
    let queryParams = [userId];
    
    // Add time filtering based on period
    if (period === 'daily') {
      whereClause += ' AND timestamp >= CURRENT_DATE';
    } else if (period === 'weekly') {
      whereClause += ' AND timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
    } else if (period === 'monthly') {
      whereClause += ' AND timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';
    }
    
    const result = await pool.query(
      `SELECT * FROM journal_entries ${whereClause} ORDER BY timestamp DESC`,
      queryParams
    );
    
    res.json({ success: true, entries: result.rows });
  } catch (error) {
    console.error('Journal entries error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tile Flip endpoints
app.get('/api/tile-flip/quotes', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const result = await pool.query(
      'SELECT quote_index, quote_text, author FROM tile_quotes ORDER BY quote_index ASC'
    );
    res.json({ success: true, quotes: result.rows });
  } catch (error) {
    console.error('Get tile quotes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tile-flip/status/:userId', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { userId } = req.params;
    
    // Get flipped tiles
    const flippedResult = await pool.query(
      'SELECT tile_index FROM tile_flips WHERE user_id = $1',
      [userId]
    );
    const flippedTiles = flippedResult.rows.map(row => row.tile_index);
    
    // Get journal entry count
    const journalResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM journal_entries WHERE user_id = $1',
      [userId]
    );
    const journalCount = journalResult.rows[0]?.count || 0;
    
    // Get reset info and next quote index
    const resetResult = await pool.query(
      'SELECT reset_at, next_quote_index FROM tile_flip_resets WHERE user_id = $1',
      [userId]
    );
    
    let nextQuoteIndex = 0;
    let resetAt = null;
    let shouldReset = false;
    
    if (resetResult.rows.length > 0) {
      nextQuoteIndex = resetResult.rows[0].next_quote_index;
      resetAt = resetResult.rows[0].reset_at;
      
      // Check if all tiles are flipped and 1 day has passed
      if (flippedTiles.length === 12 && resetAt) {
        const resetDate = new Date(resetAt);
        const oneDayLater = new Date(resetDate.getTime() + 24 * 60 * 60 * 1000);
        if (new Date() >= oneDayLater) {
          shouldReset = true;
        }
      }
    }
    
    const availableFlips = Math.max(0, journalCount - flippedTiles.length);
    
    res.json({
      success: true,
      flippedTiles,
      availableFlips,
      shouldReset,
      resetAt,
      nextQuoteIndex
    });
  } catch (error) {
    console.error('Get tile flip status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tile-flip/flip', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { userId, tileIndex } = req.body;
    
    if (userId == null || tileIndex == null) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    if (tileIndex < 0 || tileIndex > 11) {
      return res.status(400).json({ success: false, error: 'Invalid tile index' });
    }
    
    // Check if tile already flipped
    const existingFlip = await pool.query(
      'SELECT id FROM tile_flips WHERE user_id = $1 AND tile_index = $2',
      [userId, tileIndex]
    );
    
    if (existingFlip.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Tile already flipped' });
    }
    
    // Get journal entry count
    const journalResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM journal_entries WHERE user_id = $1',
      [userId]
    );
    const journalCount = journalResult.rows[0]?.count || 0;
    
    // Get flipped tiles count
    const flippedResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM tile_flips WHERE user_id = $1',
      [userId]
    );
    const flippedCount = flippedResult.rows[0]?.count || 0;
    
    // Check if user has available flips
    if (journalCount <= flippedCount) {
      return res.status(400).json({ success: false, error: 'No available flips. Complete a journal entry to earn a flip.' });
    }
    
    // Get or create reset record to get next quote index
    let resetRecord = await pool.query(
      'SELECT next_quote_index FROM tile_flip_resets WHERE user_id = $1',
      [userId]
    );
    
    let quoteIndex;
    if (resetRecord.rows.length === 0) {
      // Create reset record starting at quote 0
      quoteIndex = 0;
      await pool.query(
        'INSERT INTO tile_flip_resets (user_id, next_quote_index) VALUES ($1, $2)',
        [userId, 1]
      );
    } else {
      quoteIndex = resetRecord.rows[0].next_quote_index;
      // Increment next quote index (wrap around after 49)
      const nextIndex = (quoteIndex + 1) % 50;
      await pool.query(
        'UPDATE tile_flip_resets SET next_quote_index = $1 WHERE user_id = $2',
        [nextIndex, userId]
      );
    }
    
    // Get the quote
    const quoteResult = await pool.query(
      'SELECT quote_text, author FROM tile_quotes WHERE quote_index = $1',
      [quoteIndex]
    );
    
    if (quoteResult.rows.length === 0) {
      return res.status(500).json({ success: false, error: 'Quote not found' });
    }
    
    const quote = quoteResult.rows[0];
    
    // Create flip record
    await pool.query(
      'INSERT INTO tile_flips (user_id, tile_index, quote_index) VALUES ($1, $2, $3)',
      [userId, tileIndex, quoteIndex]
    );
    
    // Award 1 house point for tile flip
    await awardHousePoints(userId, 1);
    
    // Check if all tiles are now flipped
    const allFlippedResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM tile_flips WHERE user_id = $1',
      [userId]
    );
    const allFlippedCount = allFlippedResult.rows[0]?.count || 0;
    
    if (allFlippedCount === 12) {
      // Schedule reset for 1 day from now
      await pool.query(
        `INSERT INTO tile_flip_resets (user_id, reset_at, next_quote_index)
         VALUES ($1, CURRENT_TIMESTAMP, $2)
         ON CONFLICT (user_id) DO UPDATE
         SET reset_at = CURRENT_TIMESTAMP`,
        [userId, (quoteIndex + 1) % 50]
      );
    }
    
    // Get updated status
    const updatedFlippedResult = await pool.query(
      'SELECT tile_index FROM tile_flips WHERE user_id = $1',
      [userId]
    );
    const updatedFlippedTiles = updatedFlippedResult.rows.map(row => row.tile_index);
    const updatedAvailableFlips = Math.max(0, journalCount - updatedFlippedTiles.length);
    
    res.json({
      success: true,
      quote: {
        text: quote.quote_text,
        author: quote.author
      },
      flippedTiles: updatedFlippedTiles,
      availableFlips: updatedAvailableFlips
    });
  } catch (error) {
    console.error('Flip tile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tile-flip/reset/:userId', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { userId } = req.params;
    
    // Delete all flips for user
    await pool.query('DELETE FROM tile_flips WHERE user_id = $1', [userId]);
    
    // Update reset record
    await pool.query(
      `INSERT INTO tile_flip_resets (user_id, reset_at, next_quote_index)
       VALUES ($1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (user_id) DO UPDATE
       SET reset_at = CURRENT_TIMESTAMP, next_quote_index = $2`,
      [userId, 0]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Reset tiles error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Director endpoints
app.get('/api/director/all-users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, surname, email, user_type, class, house, created_at 
       FROM users 
       WHERE user_type IN ('student', 'teacher')
       ORDER BY user_type, first_name`
    );
    
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('Director all users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/director/all-mood-data', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    // Add time filtering based on period
    if (period === 'daily') {
      whereClause = 'WHERE mc.timestamp >= CURRENT_DATE';
    } else if (period === 'weekly') {
      whereClause = 'WHERE mc.timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
    } else if (period === 'monthly') {
      whereClause = 'WHERE mc.timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';
    }
    
    const result = await pool.query(
      `SELECT mc.*, u.first_name, u.surname, u.class, u.house, u.user_type
       FROM mood_checkins mc 
       JOIN users u ON mc.user_id = u.id 
       ${whereClause} 
       ORDER BY mc.timestamp DESC`,
      queryParams
    );
    
    res.json({ success: true, checkins: result.rows });
  } catch (error) {
    console.error('Director all mood data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/director/all-journal-entries', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    // Add time filtering based on period
    if (period === 'daily') {
      whereClause = 'WHERE je.timestamp >= CURRENT_DATE';
    } else if (period === 'weekly') {
      whereClause = 'WHERE je.timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
    } else if (period === 'monthly') {
      whereClause = 'WHERE je.timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';
    }
    
    const result = await pool.query(
      `SELECT je.*, u.first_name, u.surname, u.class, u.house, u.user_type
       FROM journal_entries je 
       JOIN users u ON je.user_id = u.id 
       ${whereClause} 
       ORDER BY je.timestamp DESC`,
      queryParams
    );
    
    res.json({ success: true, entries: result.rows });
  } catch (error) {
    console.error('Director all journal entries error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Director tile quote management
app.get('/api/director/tile-quotes', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { directorUserId } = req.query;
    if (!directorUserId) {
      return res.status(400).json({ success: false, error: 'Missing directorUserId' });
    }
    
    const check = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND user_type = $2',
      [directorUserId, 'director']
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Only directors can access quotes' });
    }
    
    const result = await pool.query(
      'SELECT quote_index, quote_text, author FROM tile_quotes ORDER BY quote_index ASC'
    );
    
    res.json({ success: true, quotes: result.rows });
  } catch (error) {
    console.error('Get tile quotes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/director/tile-quotes', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { directorUserId, quotes } = req.body;
    if (!directorUserId) {
      return res.status(400).json({ success: false, error: 'Missing directorUserId' });
    }
    if (!quotes || !Array.isArray(quotes)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid quotes array' });
    }
    
    const check = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND user_type = $2',
      [directorUserId, 'director']
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Only directors can update quotes' });
    }
    
    // Update each quote
    for (const quote of quotes) {
      if (quote.quoteIndex == null || quote.quoteText == null) {
        continue; // Skip invalid entries
      }
      
      await pool.query(
        `UPDATE tile_quotes 
         SET quote_text = $1, author = $2, updated_at = CURRENT_TIMESTAMP
         WHERE quote_index = $3`,
        [quote.quoteText, quote.author || null, quote.quoteIndex]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update tile quotes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Teacher grade analytics (no names, just emotions)
app.get('/api/teacher/grade-analytics', async (req, res) => {
  try {
    const { grade, period = 'daily' } = req.query;
    
    if (!grade) {
      return res.status(400).json({ success: false, error: 'Grade parameter is required' });
    }
    
    let whereClause = 'WHERE u.class = $1';
    let queryParams = [grade];
    
    // Add time filtering based on period
    if (period === 'daily') {
      whereClause += ' AND mc.timestamp >= CURRENT_DATE';
    } else if (period === 'weekly') {
      whereClause += ' AND mc.timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
    } else if (period === 'monthly') {
      whereClause += ' AND mc.timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';
    }
    
    const result = await pool.query(
      `SELECT mc.mood, mc.emoji, COUNT(*) as count
       FROM mood_checkins mc 
       JOIN users u ON mc.user_id = u.id 
       ${whereClause}
       GROUP BY mc.mood, mc.emoji
       ORDER BY count DESC`,
      queryParams
    );
    
    res.json({ success: true, analytics: result.rows });
  } catch (error) {
    console.error('Teacher grade analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all teachers (for student to select)
app.get('/api/teachers', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  
  try {
    const result = await pool.query(
      `SELECT id, first_name, surname, email, class, house 
       FROM users 
       WHERE user_type = 'teacher' 
       ORDER BY first_name, surname`
    );
    
    res.json({ success: true, teachers: result.rows });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send a message (student to teacher, also sends to director)
app.post('/api/messages', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  const enabled = await getMessageCenterEnabled();
  if (!enabled) {
    return res.status(503).json({ success: false, error: 'Message center is currently disabled' });
  }
  try {
    const { fromUserId, toUserId, message } = req.body;
    
    if (!fromUserId || !toUserId || !message) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Get director user ID (Justin Atlee)
    const directorResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND user_type = $2',
      ['jatlee@stpeters.co.za', 'director']
    );
    
    const directorId = directorResult.rows.length > 0 ? directorResult.rows[0].id : null;

    // Insert message to teacher
    const teacherMessageResult = await pool.query(
      'INSERT INTO messages (from_user_id, to_user_id, message) VALUES ($1, $2, $3) RETURNING *',
      [fromUserId, toUserId, message]
    );

    // Also send to director if exists
    let directorMessage = null;
    if (directorId) {
      const directorMessageResult = await pool.query(
        'INSERT INTO messages (from_user_id, to_user_id, message, thread_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [fromUserId, directorId, message, teacherMessageResult.rows[0].id]
      );
      directorMessage = directorMessageResult.rows[0];
    }
    
    res.status(201).json({ 
      success: true, 
      message: teacherMessageResult.rows[0],
      directorMessage: directorMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get messages for a user
app.get('/api/messages/:userId', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  const enabled = await getMessageCenterEnabled();
  if (!enabled) {
    return res.status(503).json({ success: false, error: 'Message center is currently disabled' });
  }
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      `SELECT m.*, 
              from_user.first_name as from_first_name, 
              from_user.surname as from_surname,
              from_user.user_type as from_user_type,
              to_user.first_name as to_first_name,
              to_user.surname as to_surname,
              to_user.user_type as to_user_type
       FROM messages m
       JOIN users from_user ON m.from_user_id = from_user.id
       JOIN users to_user ON m.to_user_id = to_user.id
       WHERE m.to_user_id = $1 OR m.from_user_id = $1
       ORDER BY m.timestamp DESC`,
      [userId]
    );
    
    res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark message as read
app.put('/api/messages/:messageId/read', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const enabled = await getMessageCenterEnabled();
    if (!enabled) {
      return res.status(503).json({ success: false, error: 'Message center is currently disabled' });
    }
    const { messageId } = req.params;
    
    const result = await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE id = $1 RETURNING *',
      [messageId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    
    res.json({ success: true, message: result.rows[0] });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get unread message count for a user
app.get('/api/messages/:userId/unread-count', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  const enabled = await getMessageCenterEnabled();
  if (!enabled) {
    return res.status(503).json({ success: false, error: 'Message center is currently disabled' });
  }
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM messages WHERE to_user_id = $1 AND is_read = FALSE',
      [userId]
    );
    
    res.json({ success: true, count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get house points for a user
app.get('/api/house-points/:userId', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { userId } = req.params;
    
    // Get user's house
    const userResult = await pool.query(
      'SELECT house FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const house = userResult.rows[0].house;
    
    // Get house points (default to 0 if not found)
    const pointsResult = await pool.query(
      'SELECT points FROM house_points WHERE user_id = $1',
      [userId]
    );
    
    const points = pointsResult.rows.length > 0 ? pointsResult.rows[0].points : 0;
    
    res.json({ success: true, points, house });
  } catch (error) {
    console.error('Get house points error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get house points totals by house (for director)
app.get('/api/director/house-points', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const { directorUserId } = req.query;
    
    if (!directorUserId) {
      return res.status(400).json({ success: false, error: 'Missing directorUserId' });
    }
    
    // Verify user is a director
    const check = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND user_type = $2',
      [directorUserId, 'director']
    );
    
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Only directors can access house points' });
    }
    
    // Get total points for each house
    const result = await pool.query(`
      SELECT 
        u.house,
        COALESCE(SUM(hp.points), 0) as total_points,
        COUNT(DISTINCT u.id) as student_count
      FROM users u
      LEFT JOIN house_points hp ON u.id = hp.user_id
      WHERE u.user_type = 'student' AND u.house IS NOT NULL
      GROUP BY u.house
      ORDER BY u.house
    `);
    
    res.json({ success: true, housePoints: result.rows });
  } catch (error) {
    console.error('Get house points totals error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete all student data (director only): students, check-ins, journals, house points, tile flips, messages
app.post('/api/director/delete-all-student-data', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const directorUserId = req.body.directorUserId != null ? Number(req.body.directorUserId) : null;
    if (directorUserId == null || Number.isNaN(directorUserId)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid directorUserId' });
    }
    const check = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND user_type = $2',
      [directorUserId, 'director']
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Only directors can delete student data' });
    }
    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE user_type = 'student'"
    );
    const count = countResult.rows[0]?.count ?? 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const studentIds = await client.query(
        "SELECT id FROM users WHERE user_type = 'student'"
      );
      const ids = (studentIds.rows || []).map(r => r.id);
      if (ids.length > 0) {
        await client.query('DELETE FROM mood_checkins WHERE user_id = ANY($1::int[])', [ids]);
        await client.query('DELETE FROM journal_entries WHERE user_id = ANY($1::int[])', [ids]);
        await client.query('DELETE FROM house_points WHERE user_id = ANY($1::int[])', [ids]);
        await client.query('DELETE FROM tile_flips WHERE user_id = ANY($1::int[])', [ids]);
        await client.query('DELETE FROM tile_flip_resets WHERE user_id = ANY($1::int[])', [ids]);
        await client.query(
          'DELETE FROM messages WHERE from_user_id = ANY($1::int[]) OR to_user_id = ANY($1::int[])',
          [ids]
        );
      }
      await client.query("DELETE FROM users WHERE user_type = 'student'");
      await client.query('COMMIT');
    } catch (txError) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
      throw txError;
    } finally {
      client.release();
    }
    res.json({ success: true, deletedCount: count });
  } catch (error) {
    console.error('Delete all student data error:', error);
    res.status(500).json({ success: false, error: error.message || 'Delete failed' });
  }
});

// Delete all teacher data (director only): teachers, check-ins, journals, messages, teacher_assignments
app.post('/api/director/delete-all-teacher-data', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const directorUserId = req.body.directorUserId != null ? Number(req.body.directorUserId) : null;
    if (directorUserId == null || Number.isNaN(directorUserId)) {
      return res.status(400).json({ success: false, error: 'Missing or invalid directorUserId' });
    }
    const check = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND user_type = $2',
      [directorUserId, 'director']
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Only directors can delete teacher data' });
    }
    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE user_type = 'teacher'"
    );
    const count = countResult.rows[0]?.count ?? 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const teacherIds = await client.query(
        "SELECT id FROM users WHERE user_type = 'teacher'"
      );
      const ids = (teacherIds.rows || []).map(r => r.id);
      if (ids.length > 0) {
        await client.query('DELETE FROM mood_checkins WHERE user_id = ANY($1::int[])', [ids]);
        await client.query('DELETE FROM journal_entries WHERE user_id = ANY($1::int[])', [ids]);
        await client.query('DELETE FROM tile_flips WHERE user_id = ANY($1::int[])', [ids]);
        await client.query('DELETE FROM tile_flip_resets WHERE user_id = ANY($1::int[])', [ids]);
        await client.query(
          'DELETE FROM messages WHERE from_user_id = ANY($1::int[]) OR to_user_id = ANY($1::int[])',
          [ids]
        );
        await client.query('DELETE FROM teacher_assignments WHERE teacher_id = ANY($1::int[])', [ids]);
      }
      await client.query("DELETE FROM users WHERE user_type = 'teacher'");
      await client.query('COMMIT');
    } catch (txError) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore */ }
      throw txError;
    } finally {
      client.release();
    }
    res.json({ success: true, deletedCount: count });
  } catch (error) {
    console.error('Delete all teacher data error:', error);
    res.status(500).json({ success: false, error: error.message || 'Delete failed' });
  }
});

// Get school house points (totals by house) - for students/teachers
app.get('/api/school-house-points', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const result = await pool.query(`
      SELECT 
        u.house,
        COALESCE(SUM(hp.points), 0) as total_points,
        COUNT(DISTINCT u.id) as student_count
      FROM users u
      LEFT JOIN house_points hp ON u.id = hp.user_id
      WHERE u.user_type = 'student' AND u.house IS NOT NULL
      GROUP BY u.house
      ORDER BY u.house
    `);
    res.json({ success: true, housePoints: result.rows });
  } catch (error) {
    console.error('School house points error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get grade house points (totals by class/grade) - for students/teachers
app.get('/api/grade-house-points', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  try {
    const result = await pool.query(`
      SELECT 
        u.class as grade,
        COALESCE(SUM(hp.points), 0) as total_points,
        COUNT(DISTINCT u.id) as student_count
      FROM users u
      LEFT JOIN house_points hp ON u.id = hp.user_id
      WHERE u.user_type = 'student' AND u.class IS NOT NULL AND u.class != ''
      GROUP BY u.class
      ORDER BY u.class
    `);
    res.json({ success: true, gradePoints: result.rows });
  } catch (error) {
    console.error('Grade house points error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static files (must be after API routes)
app.use(express.static('.'));

// Handle all other routes by serving index.html (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
async function startServer() {
  try {
    log(`Binding to port ${PORT}...`);
    // Start the server first
    app.listen(PORT, () => {
      log(`🚀 Server running on port ${PORT}`);
      log(`📱 Open http://localhost:${PORT}`);
    });
    
    // Initialize database in background (non-blocking)
    initializeDatabase().catch(error => {
      console.error('❌ Database initialization failed:', error);
      log('⚠️ App will continue without database - some features may not work');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
