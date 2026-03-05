/**
 * Initial schema: users, teacher_assignments, mood_checkins, journal_entries,
 * messages, app_settings, tile_flips, tile_quotes, tile_flip_resets, house_points.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
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
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS teacher_assignments (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      grade VARCHAR(20),
      house VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(teacher_id, grade, house)
    )
  `);
  pgm.sql(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check`);
  pgm.sql(`
    ALTER TABLE users ADD CONSTRAINT users_user_type_check
    CHECK (user_type IN ('student', 'teacher', 'director'))
  `);

  pgm.sql(`
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
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      entry TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  pgm.sql(`
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
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_messages_to_user_id ON messages(to_user_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_messages_from_user_id ON messages(from_user_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)`);

  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_mood_checkins_user_id ON mood_checkins(user_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_mood_checkins_timestamp ON mood_checkins(timestamp)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_journal_entries_timestamp ON journal_entries(timestamp)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type)`);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  pgm.sql(`
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
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS tile_quotes (
      id SERIAL PRIMARY KEY,
      quote_index INTEGER NOT NULL UNIQUE CHECK (quote_index >= 0 AND quote_index <= 49),
      quote_text TEXT NOT NULL,
      author VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS tile_flip_resets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      next_quote_index INTEGER DEFAULT 0 CHECK (next_quote_index >= 0 AND next_quote_index <= 49),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    )
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_tile_flips_user_id ON tile_flips(user_id)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_tile_flips_tile_index ON tile_flips(tile_index)`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_tile_flip_resets_user_id ON tile_flip_resets(user_id)`);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS house_points (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      points INTEGER NOT NULL DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    )
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_house_points_user_id ON house_points(user_id)`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS house_points`);
  pgm.sql(`DROP TABLE IF EXISTS tile_flip_resets`);
  pgm.sql(`DROP TABLE IF EXISTS tile_flips`);
  pgm.sql(`DROP TABLE IF EXISTS tile_quotes`);
  pgm.sql(`DROP TABLE IF EXISTS app_settings`);
  pgm.sql(`DROP TABLE IF EXISTS messages`);
  pgm.sql(`DROP TABLE IF EXISTS journal_entries`);
  pgm.sql(`DROP TABLE IF EXISTS mood_checkins`);
  pgm.sql(`DROP TABLE IF EXISTS teacher_assignments`);
  pgm.sql(`DROP TABLE IF EXISTS users`);
};
