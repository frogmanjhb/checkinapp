/**
 * App settings (feature flags, limits) from app_settings table.
 * All functions take pool; return safe defaults when pool is null or query fails.
 */

async function getMessageCenterEnabled(pool) {
  if (!pool) return true;
  try {
    const r = await pool.query("SELECT value FROM app_settings WHERE key = 'message_center_enabled'");
    if (!r.rows.length) return true;
    return r.rows[0].value === 'true';
  } catch (e) {
    console.error('getMessageCenterEnabled:', e);
    return true;
  }
}

async function getGhostModeEnabled(pool) {
  if (!pool) return true;
  try {
    const r = await pool.query("SELECT value FROM app_settings WHERE key = 'ghost_mode_enabled'");
    if (!r.rows.length) return true;
    return r.rows[0].value === 'true';
  } catch (e) {
    console.error('getGhostModeEnabled:', e);
    return true;
  }
}

async function getTileFlipEnabled(pool) {
  if (!pool) return true;
  try {
    const r = await pool.query("SELECT value FROM app_settings WHERE key = 'tile_flip_enabled'");
    if (!r.rows.length) return true;
    return r.rows[0].value === 'true';
  } catch (e) {
    console.error('getTileFlipEnabled:', e);
    return true;
  }
}

async function getHousePointsEnabled(pool) {
  if (!pool) return true;
  try {
    const r = await pool.query("SELECT value FROM app_settings WHERE key = 'house_points_enabled'");
    if (!r.rows.length) return true;
    return r.rows[0].value === 'true';
  } catch (e) {
    console.error('getHousePointsEnabled:', e);
    return true;
  }
}

async function getMaxCheckinsPerDay(pool) {
  if (!pool) return 1;
  try {
    const r = await pool.query("SELECT value FROM app_settings WHERE key = 'max_checkins_per_day'");
    if (!r.rows.length) return 1;
    const n = parseInt(r.rows[0].value, 10);
    return Number.isNaN(n) || n < 1 ? 1 : Math.min(n, 999);
  } catch (e) {
    console.error('getMaxCheckinsPerDay:', e);
    return 1;
  }
}

async function getMaxJournalEntriesPerDay(pool) {
  if (!pool) return 1;
  try {
    const r = await pool.query("SELECT value FROM app_settings WHERE key = 'max_journal_entries_per_day'");
    if (!r.rows.length) return 1;
    const n = parseInt(r.rows[0].value, 10);
    return Number.isNaN(n) || n < 1 ? 1 : Math.min(n, 999);
  } catch (e) {
    console.error('getMaxJournalEntriesPerDay:', e);
    return 1;
  }
}

module.exports = {
  getMessageCenterEnabled,
  getGhostModeEnabled,
  getTileFlipEnabled,
  getHousePointsEnabled,
  getMaxCheckinsPerDay,
  getMaxJournalEntriesPerDay,
};
