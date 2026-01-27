const { Pool } = require('pg');

// Database connection
const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

if (!dbUrl) {
  console.error('❌ No database URL found. Please set DATABASE_URL environment variable.');
  process.exit(1);
}

const sslEnabledEnv = (process.env.DATABASE_SSL || '').toLowerCase();
const useSsl = sslEnabledEnv ? sslEnabledEnv !== 'false' : true; // default keeps existing behavior

const pool = new Pool({
  connectionString: dbUrl,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
});

async function migrateDatabase() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Connect to database
    await pool.connect();
    console.log('✅ Connected to database');
    
    // Add new columns to mood_checkins table
    console.log('📝 Adding new columns to mood_checkins table...');
    
    // Add location column
    await pool.query(`
      ALTER TABLE mood_checkins 
      ADD COLUMN IF NOT EXISTS location VARCHAR(50)
    `);
    console.log('✅ Added location column');
    
    // Add reasons column (array of text)
    await pool.query(`
      ALTER TABLE mood_checkins 
      ADD COLUMN IF NOT EXISTS reasons TEXT[]
    `);
    console.log('✅ Added reasons column');
    
    // Add emotions column (array of text)
    await pool.query(`
      ALTER TABLE mood_checkins 
      ADD COLUMN IF NOT EXISTS emotions TEXT[]
    `);
    console.log('✅ Added emotions column');
    
    // Verify the changes
    console.log('🔍 Verifying table structure...');
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'mood_checkins' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Current mood_checkins table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // App settings (plugins, e.g. message center)
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
    console.log('✅ app_settings table ready');
    
    console.log('🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run migration
migrateDatabase();
