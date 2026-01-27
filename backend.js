require('dotenv').config();
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
console.log('🔍 Database URL:', dbUrl ? 'Found' : 'Not found');
console.log('🔍 NODE_ENV:', process.env.NODE_ENV);

let pool = null;
if (dbUrl) {
  const sslEnabledEnv = (process.env.DATABASE_SSL || '').toLowerCase();
  const useSsl = sslEnabledEnv ? sslEnabledEnv !== 'false' : true; // default keeps existing behavior

  pool = new Pool({
    connectionString: dbUrl,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
  });
} else {
  console.log('⚠️ No database URL found - running without database');
}

// Test database connection
if (pool) {
  pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
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
    // Helper: seed demo check-ins (3 weeks) for the demo student
    async function seedDemoStudentCheckins(demoUserId) {
      // If already seeded with ~3 weeks, skip
      const existingCount = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM mood_checkins
         WHERE user_id = $1 AND timestamp >= (CURRENT_DATE - INTERVAL '21 days')`,
        [demoUserId]
      );

      const count = existingCount.rows?.[0]?.count ?? 0;
      if (count >= 18) {
        console.log(`✅ Demo student already has ${count} recent check-ins (skipping seed)`);
        return;
      }

      const moodPresets = [
        {
          mood: 'happy',
          emoji: '😊',
          emotions: ['grateful', 'confident', 'proud'],
          reasons: ['friends', 'schoolwork', 'sports'],
          notes: 'Feeling good today. Things are going well.'
        },
        {
          mood: 'excited',
          emoji: '🤩',
          emotions: ['energized', 'motivated', 'curious'],
          reasons: ['friends', 'tests', 'schoolwork'],
          notes: 'Excited for what’s coming up today.'
        },
        {
          mood: 'calm',
          emoji: '😌',
          emotions: ['relaxed', 'peaceful', 'focused'],
          reasons: ['schoolwork', 'friends'],
          notes: 'Calm and focused. Taking things one step at a time.'
        },
        {
          mood: 'tired',
          emoji: '😴',
          emotions: ['sleepy', 'drained', 'overwhelmed'],
          reasons: ['sleep', 'tests', 'schoolwork'],
          notes: 'A bit tired today. I could use more rest.'
        },
        {
          mood: 'anxious',
          emoji: '😰',
          emotions: ['worried', 'nervous', 'stressed'],
          reasons: ['tests', 'schoolwork', 'classmates'],
          notes: 'Feeling anxious. Trying to breathe and stay positive.'
        },
        {
          mood: 'sad',
          emoji: '😢',
          emotions: ['down', 'lonely', 'disappointed'],
          reasons: ['friends', 'family'],
          notes: 'Not my best day. Hoping tomorrow feels better.'
        },
        {
          mood: 'angry',
          emoji: '😠',
          emotions: ['frustrated', 'irritated', 'upset'],
          reasons: ['classmates', 'schoolwork'],
          notes: 'Feeling frustrated. I’m trying to cool down.'
        },
        {
          mood: 'confused',
          emoji: '😕',
          emotions: ['uncertain', 'stuck', 'distracted'],
          reasons: ['schoolwork', 'teacher'],
          notes: 'Feeling a bit confused. I might ask for help.'
        }
      ];

      const locations = ['school', 'home'];
      const now = new Date();
      const startDaysAgo = 20; // inclusive -> 21 total days (20..0)
      let inserted = 0;

      for (let d = startDaysAgo; d >= 0; d--) {
        const day = new Date(now);
        day.setDate(now.getDate() - d);

        // If a check-in already exists for this date, skip it (avoid duplicates)
        const exists = await pool.query(
          `SELECT 1
           FROM mood_checkins
           WHERE user_id = $1 AND DATE(timestamp) = $2::date
           LIMIT 1`,
          [demoUserId, day.toISOString().slice(0, 10)]
        );

        if (exists.rows.length > 0) continue;

        // Deterministic variation by day index (no random flakiness)
        const preset = moodPresets[d % moodPresets.length];
        const location = locations[d % locations.length];

        // Set a realistic time (between 07:30 and 18:30)
        const minutesIntoDay = 450 + ((d * 37) % 660); // 450..1110
        const ts = new Date(day);
        ts.setHours(0, 0, 0, 0);
        ts.setMinutes(minutesIntoDay);

        await pool.query(
          `INSERT INTO mood_checkins (user_id, mood, emoji, notes, location, reasons, emotions, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            demoUserId,
            preset.mood,
            preset.emoji,
            preset.notes,
            location,
            preset.reasons,
            preset.emotions,
            ts
          ]
        );

        inserted++;
      }

      console.log(`✅ Seeded ${inserted} demo student check-ins (~3 weeks)`);
    }

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
    console.log('✅ app_settings initialized');

    console.log('✅ Database tables initialized successfully');

    // Add demo users if they don't exist
    const demoUserExists = await pool.query('SELECT id FROM users WHERE email = $1', ['demo@stpeters.co.za']);
    let demoUserId = demoUserExists.rows.length > 0 ? demoUserExists.rows[0].id : null;
    if (demoUserExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('password', 10);
      const demoInsert = await pool.query(`
        INSERT INTO users (first_name, surname, email, password_hash, user_type, class, house)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, ['Demo', 'Student', 'demo@stpeters.co.za', hashedPassword, 'student', 'Grade 6', 'Mirfield']);
      demoUserId = demoInsert.rows[0].id;
      console.log('✅ Demo user created');
    }

    // Seed 3 weeks of mood check-ins for the demo student (if needed)
    if (demoUserId) {
      try {
        await seedDemoStudentCheckins(demoUserId);
      } catch (error) {
        console.log('⚠️ Demo student check-in seeding failed:', error.message);
      }
    }

    // Add additional demo students for Grade 5 and Grade 7
    const additionalStudents = [
      { name: 'Alice', surname: 'Johnson', email: 'alice.johnson@stpeters.co.za', grade: 'Grade 5', house: 'Mirfield' },
      { name: 'Bob', surname: 'Smith', email: 'bob.smith@stpeters.co.za', grade: 'Grade 5', house: 'Mirfield' },
      { name: 'Charlie', surname: 'Brown', email: 'charlie.brown@stpeters.co.za', grade: 'Grade 5', house: 'Mirfield' },
      { name: 'Diana', surname: 'Davis', email: 'diana.davis@stpeters.co.za', grade: 'Grade 7', house: 'Mirfield' },
      { name: 'Eve', surname: 'Wilson', email: 'eve.wilson@stpeters.co.za', grade: 'Grade 7', house: 'Mirfield' },
      { name: 'Frank', surname: 'Miller', email: 'frank.miller@stpeters.co.za', grade: 'Grade 7', house: 'Mirfield' }
    ];

    for (const student of additionalStudents) {
      const studentExists = await pool.query('SELECT id FROM users WHERE email = $1', [student.email]);
      if (studentExists.rows.length === 0) {
        const hashedPassword = await bcrypt.hash('password', 10);
        await pool.query(`
          INSERT INTO users (first_name, surname, email, password_hash, user_type, class, house)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [student.name, student.surname, student.email, hashedPassword, 'student', student.grade, student.house]);
        console.log(`✅ Demo student ${student.name} ${student.surname} (${student.grade}) created`);
      }
    }

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
    const [messageCenterEnabled, ghostModeEnabled] = await Promise.all([
      getMessageCenterEnabled(),
      getGhostModeEnabled()
    ]);
    res.json({ success: true, messageCenterEnabled, ghostModeEnabled });
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
    const { directorUserId, messageCenterEnabled, ghostModeEnabled } = req.body;
    if (directorUserId == null) {
      return res.status(400).json({ success: false, error: 'Missing directorUserId' });
    }
    if (typeof messageCenterEnabled !== 'boolean' && typeof ghostModeEnabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'At least one of messageCenterEnabled or ghostModeEnabled required' });
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
    res.json({ success: true, ...out });
  } catch (error) {
    console.error('Update director settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mood check-in
app.post('/api/mood-checkin', async (req, res) => {
  try {
    const { userId, mood, emoji, notes, location, reasons, emotions } = req.body;
    
    
    if (!userId || !mood || !emoji) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await pool.query(
      'INSERT INTO mood_checkins (user_id, mood, emoji, notes, location, reasons, emotions) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [userId, mood, emoji, notes, location, reasons || [], emotions || []]
    );
    
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

// Journal entry endpoints
app.post('/api/journal-entry', async (req, res) => {
  try {
    const { userId, entry } = req.body;
    
    if (!userId || !entry) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await pool.query(
      'INSERT INTO journal_entries (user_id, entry) VALUES ($1, $2) RETURNING *',
      [userId, entry]
    );
    
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

// Serve static files (must be after API routes)
app.use(express.static('.'));

// Handle all other routes by serving index.html (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
async function startServer() {
  try {
    // Start the server first
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 App available at http://localhost:${PORT}`);
    });
    
    // Initialize database in background (non-blocking)
    initializeDatabase().catch(error => {
      console.error('❌ Database initialization failed:', error);
      console.log('⚠️ App will continue without database - some features may not work');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
