/**
 * Track total tile flips consumed so immediate resets don't grant extra flips.
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add column for credit tracking.
  pgm.sql(`
    ALTER TABLE tile_flip_resets
    ADD COLUMN IF NOT EXISTS flips_used INTEGER NOT NULL DEFAULT 0
  `);

  // Best-effort backfill for existing rows:
  // If a user currently has N tiles flipped, assume they've consumed N flips.
  pgm.sql(`
    UPDATE tile_flip_resets tr
    SET flips_used = COALESCE((
      SELECT COUNT(*)::int
      FROM tile_flips tf
      WHERE tf.user_id = tr.user_id
    ), 0)
  `);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE tile_flip_resets DROP COLUMN IF EXISTS flips_used`);
};

