/**
 * Seed default app_settings (feature flags and class names).
 * Idempotent: ON CONFLICT DO NOTHING.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`INSERT INTO app_settings (key, value) VALUES ('message_center_enabled', 'true') ON CONFLICT (key) DO NOTHING`);
  pgm.sql(`INSERT INTO app_settings (key, value) VALUES ('ghost_mode_enabled', 'true') ON CONFLICT (key) DO NOTHING`);
  pgm.sql(`INSERT INTO app_settings (key, value) VALUES ('tile_flip_enabled', 'true') ON CONFLICT (key) DO NOTHING`);
  pgm.sql(`INSERT INTO app_settings (key, value) VALUES ('house_points_enabled', 'true') ON CONFLICT (key) DO NOTHING`);
  pgm.sql(`INSERT INTO app_settings (key, value) VALUES ('max_checkins_per_day', '1') ON CONFLICT (key) DO NOTHING`);
  pgm.sql(`INSERT INTO app_settings (key, value) VALUES ('max_journal_entries_per_day', '1') ON CONFLICT (key) DO NOTHING`);
  const defaultClassNames = JSON.stringify(['5EF', '5AM', '5JS', '6A', '6B', '6C', '7A', '7B', '7C']);
  pgm.sql(`INSERT INTO app_settings (key, value) VALUES ('class_names', '${defaultClassNames.replace(/'/g, "''")}') ON CONFLICT (key) DO NOTHING`);
};

exports.down = (pgm) => {
  pgm.sql(`DELETE FROM app_settings WHERE key IN (
    'message_center_enabled', 'ghost_mode_enabled', 'tile_flip_enabled',
    'house_points_enabled', 'max_checkins_per_day', 'max_journal_entries_per_day', 'class_names'
  )`);
};
