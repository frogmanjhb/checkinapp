/**
 * Check-in and journal routes: mood, journal, students, teacher class/checkins/analytics, settings (GET), house-points (user).
 */
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

function createCheckinsRouter({ pool, settings, housePoints }) {
  const router = express.Router();
  const {
    getMessageCenterEnabled,
    getGhostModeEnabled,
    getTileFlipEnabled,
    getHousePointsEnabled,
    getMaxCheckinsPerDay,
    getMaxJournalEntriesPerDay,
  } = settings;

  router.get('/settings', async (req, res) => {
    try {
      const [messageCenterEnabled, ghostModeEnabled, tileFlipEnabled, housePointsEnabled] = await Promise.all([
        getMessageCenterEnabled(pool),
        getGhostModeEnabled(pool),
        getTileFlipEnabled(pool),
        getHousePointsEnabled(pool),
      ]);
      res.json({ success: true, messageCenterEnabled, ghostModeEnabled, tileFlipEnabled, housePointsEnabled });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/mood-checkin', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { mood, emoji, notes, location, reasons, emotions } = req.body;
      if (!mood || !emoji) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      if (pool) {
        const userRow = await pool.query('SELECT user_type FROM users WHERE id = $1', [userId]);
        const isStudent = userRow.rows.length > 0 && userRow.rows[0].user_type === 'student';
        if (isStudent) {
          const maxPerDay = await getMaxCheckinsPerDay(pool);
          const countResult = await pool.query(
            `SELECT COUNT(*)::int AS count FROM mood_checkins WHERE user_id = $1 AND timestamp::date = CURRENT_DATE`,
            [userId]
          );
          const count = countResult.rows[0]?.count ?? 0;
          if (count >= maxPerDay) {
            return res.status(400).json({
              success: false,
              error: maxPerDay === 1 ? "You've already checked in today." : `You've reached the daily limit of ${maxPerDay} check-ins.`,
            });
          }
        }
      }

      const result = await pool.query(
        'INSERT INTO mood_checkins (user_id, mood, emoji, notes, location, reasons, emotions) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [userId, mood, emoji, notes, location, reasons || [], emotions || []]
      );
      await housePoints.awardHousePoints(pool, userId, 1);
      res.status(201).json({ success: true, checkin: result.rows[0] });
    } catch (error) {
      console.error('Mood check-in error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/mood-history/:userId', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      if (parseInt(req.params.userId, 10) !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const { period = 'daily' } = req.query;
      let whereClause = 'WHERE user_id = $1';
      const queryParams = [userId];
      if (period === 'daily') whereClause += ' AND timestamp >= CURRENT_DATE';
      else if (period === 'weekly') whereClause += ' AND timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
      else if (period === 'monthly') whereClause += ' AND timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';

      const result = await pool.query(`SELECT * FROM mood_checkins ${whereClause} ORDER BY timestamp DESC`, queryParams);
      res.json({ success: true, checkins: result.rows });
    } catch (error) {
      console.error('Mood history error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/students', requireAuth, async (req, res) => {
    try {
      const { class: classFilter, house: houseFilter } = req.query;
      let whereClause = 'WHERE user_type = $1';
      const queryParams = ['student'];
      if (classFilter) {
        whereClause += ' AND class = $2';
        queryParams.push(classFilter);
      }
      if (houseFilter) {
        whereClause += ` AND house = $${queryParams.length + 1}`;
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

  router.get('/teacher/students/:teacherId', requireAuth, async (req, res) => {
    try {
      const { teacherId } = req.params;
      if (req.user.user_type !== 'teacher' && req.user.user_type !== 'director') {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      if (req.user.user_type === 'teacher' && parseInt(teacherId, 10) !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const teacherResult = await pool.query(
        'SELECT class, house FROM users WHERE id = $1 AND user_type = $2',
        [teacherId, 'teacher']
      );
      if (teacherResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Teacher not found' });
      }
      const teacher = teacherResult.rows[0];
      const result = await pool.query(
        `SELECT id, first_name, surname, email, class, house, created_at FROM users
         WHERE user_type = $1 AND class = $2 AND house = $3 ORDER BY first_name`,
        ['student', teacher.class, teacher.house]
      );
      res.json({ success: true, students: result.rows, teacherAssignment: { grade: teacher.class, house: teacher.house } });
    } catch (error) {
      console.error('Teacher students list error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/teacher/assignments/:teacherId', requireAuth, async (req, res) => {
    try {
      const { teacherId } = req.params;
      if (req.user.user_type === 'teacher' && parseInt(teacherId, 10) !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const result = await pool.query(
        'SELECT grade, house FROM teacher_assignments WHERE teacher_id = $1 ORDER BY grade, house',
        [teacherId]
      );
      res.json({ success: true, assignments: result.rows });
    } catch (error) {
      console.error('Teacher assignments error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/all-mood-checkins', requireAuth, requireRole('teacher', 'director'), async (req, res) => {
    try {
      const { period = 'daily' } = req.query;
      let whereClause = '';
      if (period === 'daily') whereClause = 'WHERE timestamp >= CURRENT_DATE';
      else if (period === 'weekly') whereClause = 'WHERE timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
      else if (period === 'monthly') whereClause = 'WHERE timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';

      const result = await pool.query(
        `SELECT mc.*, u.first_name, u.surname, u.class, u.house FROM mood_checkins mc JOIN users u ON mc.user_id = u.id ${whereClause} ORDER BY mc.timestamp DESC`,
        []
      );
      res.json({ success: true, checkins: result.rows });
    } catch (error) {
      console.error('All mood check-ins error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.put('/teacher/class/:teacherId', requireAuth, async (req, res) => {
    try {
      const { teacherId } = req.params;
      const { className } = req.body;
      if (req.user.user_type === 'teacher' && parseInt(teacherId, 10) !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      if (!teacherId) return res.status(400).json({ success: false, error: 'Missing teacher ID' });

      const teacherResult = await pool.query('SELECT id, user_type FROM users WHERE id = $1', [teacherId]);
      if (teacherResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Teacher not found' });
      if (teacherResult.rows[0].user_type !== 'teacher') {
        return res.status(400).json({ success: false, error: 'User is not a teacher' });
      }
      const updateResult = await pool.query(
        'UPDATE users SET class = $1, updated_at = NOW() WHERE id = $2 RETURNING id, first_name, surname, class, house',
        [className || null, teacherId]
      );
      res.json({ success: true, teacher: updateResult.rows[0] });
    } catch (error) {
      console.error('Update teacher class error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/teacher/class-checkins/:teacherId', requireAuth, async (req, res) => {
    try {
      const { teacherId } = req.params;
      if (req.user.user_type === 'teacher' && parseInt(teacherId, 10) !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const { period = 'daily' } = req.query;

      const teacherResult = await pool.query(
        'SELECT class FROM users WHERE id = $1 AND user_type = $2',
        [teacherId, 'teacher']
      );
      if (teacherResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Teacher not found' });
      }
      const teacherClass = teacherResult.rows[0].class;
      if (!teacherClass) {
        return res.json({ success: true, checkins: [], message: 'Teacher has no class assigned' });
      }

      let timeFilter = '';
      if (period === 'daily') timeFilter = 'AND mc.timestamp >= CURRENT_DATE';
      else if (period === 'weekly') timeFilter = 'AND mc.timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
      else if (period === 'monthly') timeFilter = 'AND mc.timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';

      const result = await pool.query(
        `SELECT mc.*, u.first_name, u.surname, u.class, u.house, u.user_type
         FROM mood_checkins mc JOIN users u ON mc.user_id = u.id
         WHERE u.user_type = 'student' AND u.class = $1 ${timeFilter} ORDER BY mc.timestamp DESC`,
        [teacherClass]
      );
      res.json({ success: true, checkins: result.rows, className: teacherClass });
    } catch (error) {
      console.error('Teacher class check-ins error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/journal-entry', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { entry } = req.body;
      if (!entry) return res.status(400).json({ success: false, error: 'Missing required fields' });

      if (pool) {
        const userRow = await pool.query('SELECT user_type FROM users WHERE id = $1', [userId]);
        const isStudent = userRow.rows.length > 0 && userRow.rows[0].user_type === 'student';
        if (isStudent) {
          const maxPerDay = await getMaxJournalEntriesPerDay(pool);
          const countResult = await pool.query(
            `SELECT COUNT(*)::int AS count FROM journal_entries WHERE user_id = $1 AND timestamp::date = CURRENT_DATE`,
            [userId]
          );
          const count = countResult.rows[0]?.count ?? 0;
          if (count >= maxPerDay) {
            return res.status(400).json({
              success: false,
              error: maxPerDay === 1 ? "You've already done your journal entry today." : `You've reached the daily limit of ${maxPerDay} journal entries.`,
            });
          }
        }
      }

      const result = await pool.query(
        'INSERT INTO journal_entries (user_id, entry) VALUES ($1, $2) RETURNING *',
        [userId, entry]
      );
      await housePoints.awardHousePoints(pool, userId, 2);
      res.status(201).json({ success: true, journalEntry: result.rows[0] });
    } catch (error) {
      console.error('Journal entry error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/journal-entries/:userId', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      if (parseInt(req.params.userId, 10) !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const { period = 'daily' } = req.query;
      let whereClause = 'WHERE user_id = $1';
      const queryParams = [userId];
      if (period === 'daily') whereClause += ' AND timestamp >= CURRENT_DATE';
      else if (period === 'weekly') whereClause += ' AND timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
      else if (period === 'monthly') whereClause += ' AND timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';

      const result = await pool.query(`SELECT * FROM journal_entries ${whereClause} ORDER BY timestamp DESC`, queryParams);
      res.json({ success: true, entries: result.rows });
    } catch (error) {
      console.error('Journal entries error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/teacher/grade-analytics', requireAuth, requireRole('teacher', 'director'), async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
      const { grade, period = 'daily' } = req.query;
      if (!grade) return res.status(400).json({ success: false, error: 'Grade parameter is required' });

      let whereClause = 'WHERE u.class = $1';
      const queryParams = [grade];
      if (period === 'daily') whereClause += ' AND mc.timestamp >= CURRENT_DATE';
      else if (period === 'weekly') whereClause += ' AND mc.timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
      else if (period === 'monthly') whereClause += ' AND mc.timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';

      const result = await pool.query(
        `SELECT mc.mood, mc.emoji, COUNT(*) as count FROM mood_checkins mc JOIN users u ON mc.user_id = u.id ${whereClause}
         GROUP BY mc.mood, mc.emoji ORDER BY count DESC`,
        queryParams
      );
      res.json({ success: true, analytics: result.rows });
    } catch (error) {
      console.error('Teacher grade analytics error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/teachers', requireAuth, async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const result = await pool.query(
        `SELECT id, first_name, surname, email, class, house FROM users WHERE user_type = 'teacher' ORDER BY first_name, surname`
      );
      res.json({ success: true, teachers: result.rows });
    } catch (error) {
      console.error('Get teachers error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/house-points/:userId', requireAuth, async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const userId = req.user.id;
      if (parseInt(req.params.userId, 10) !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const userResult = await pool.query('SELECT house FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      const house = userResult.rows[0].house;
      const pointsResult = await pool.query('SELECT points FROM house_points WHERE user_id = $1', [userId]);
      const points = pointsResult.rows.length > 0 ? pointsResult.rows[0].points : 0;
      res.json({ success: true, points, house });
    } catch (error) {
      console.error('Get house points error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = { createCheckinsRouter };
