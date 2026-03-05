/**
 * House points: award points to students (e.g. on check-in, journal, tile flip).
 * @param {import('pg').Pool} pool
 * @param {number} userId
 * @param {number} points
 */
async function awardHousePoints(pool, userId, points) {
  if (!pool) return;
  try {
    const userResult = await pool.query(
      'SELECT house FROM users WHERE id = $1 AND user_type = $2',
      [userId, 'student']
    );
    if (userResult.rows.length === 0) return;
    await pool.query(
      `INSERT INTO house_points (user_id, points, last_updated)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         points = house_points.points + $2,
         last_updated = CURRENT_TIMESTAMP`,
      [userId, points]
    );
  } catch (error) {
    console.error('Error awarding house points:', error);
  }
}

module.exports = { awardHousePoints };
