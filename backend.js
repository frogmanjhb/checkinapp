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
  pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
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
app.use(express.static('.'));

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

    // Create mood check-ins table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mood_checkins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        mood VARCHAR(20) NOT NULL,
        emoji VARCHAR(10) NOT NULL,
        notes TEXT,
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

    console.log('✅ Database tables initialized successfully');

    // Add demo user if it doesn't exist
    const demoUserExists = await pool.query('SELECT id FROM users WHERE email = $1', ['demo@stpeters.co.za']);
    if (demoUserExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('password', 10);
      await pool.query(`
        INSERT INTO users (first_name, surname, email, password_hash, user_type, class, house)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['Demo', 'Student', 'demo@stpeters.co.za', hashedPassword, 'student', 'Grade 6', 'Mirfield']);
      console.log('✅ Demo user created');
    }

    // Add director user if it doesn't exist
    const directorExists = await pool.query('SELECT id FROM users WHERE email = $1', ['jatlee@stpeters.co.za']);
    if (directorExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('director123!', 10);
      await pool.query(`
        INSERT INTO users (first_name, surname, email, password_hash, user_type)
        VALUES ($1, $2, $3, $4, $5)
      `, ['Jat', 'Lee', 'jatlee@stpeters.co.za', hashedPassword, 'director']);
      console.log('✅ Director user created');
    }

  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// API Routes

// User registration
app.post('/api/register', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  
  try {
    const { firstName, surname, email, password, userType, class: studentClass, house } = req.body;
    
    // Validate required fields
    if (!firstName || !surname || !email || !password || !userType) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Validate email format
    if (!email.endsWith('@stpeters.co.za')) {
      return res.status(400).json({ success: false, error: 'Email must be a @stpeters.co.za address' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insert user
    const result = await pool.query(
      'INSERT INTO users (first_name, surname, email, password_hash, user_type, class, house) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, first_name, surname, email, user_type, class, house, created_at',
      [firstName, surname, email, passwordHash, userType, studentClass, house]
    );
    
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

// Mood check-in
app.post('/api/mood-checkin', async (req, res) => {
  try {
    const { userId, mood, emoji, notes } = req.body;
    
    if (!userId || !mood || !emoji) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await pool.query(
      'INSERT INTO mood_checkins (user_id, mood, emoji, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, mood, emoji, notes]
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
