/**
 * Director and admin routes: settings, class names, student/teacher management, house points, bulk deletes, reset password.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth, requireRole } = require('../middleware/auth');

function validatePasswordFormat(pw) {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Password must contain at least one lowercase letter';
  if (!/\d/.test(pw)) return 'Password must contain at least one number';
  return null;
}

const DEFAULT_CLASS_NAMES = ['5EF', '5AM', '5JS', '6A', '6B', '6C', '7A', '7B', '7C'];

function createDirectorRouter({ pool, settings }) {
  const router = express.Router();
  const { getMaxCheckinsPerDay, getMaxJournalEntriesPerDay } = settings;

  router.put('/director/settings', requireAuth, requireRole('director'), async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const { messageCenterEnabled, ghostModeEnabled, tileFlipEnabled, housePointsEnabled } = req.body;
      if (
        typeof messageCenterEnabled !== 'boolean' &&
        typeof ghostModeEnabled !== 'boolean' &&
        typeof tileFlipEnabled !== 'boolean' &&
        typeof housePointsEnabled !== 'boolean'
      ) {
        return res.status(400).json({ success: false, error: 'At least one setting must be provided' });
      }
      const out = {};
      const upsert = async (key, value) => {
        const val = value ? 'true' : 'false';
        await pool.query(
          `INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, val]
        );
      };
      if (typeof messageCenterEnabled === 'boolean') {
        await upsert('message_center_enabled', messageCenterEnabled);
        out.messageCenterEnabled = messageCenterEnabled;
      }
      if (typeof ghostModeEnabled === 'boolean') {
        await upsert('ghost_mode_enabled', ghostModeEnabled);
        out.ghostModeEnabled = ghostModeEnabled;
      }
      if (typeof tileFlipEnabled === 'boolean') {
        await upsert('tile_flip_enabled', tileFlipEnabled);
        out.tileFlipEnabled = tileFlipEnabled;
      }
      if (typeof housePointsEnabled === 'boolean') {
        await upsert('house_points_enabled', housePointsEnabled);
        out.housePointsEnabled = housePointsEnabled;
      }
      res.json({ success: true, ...out });
    } catch (error) {
      console.error('Update director settings error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/director/checkin-journal-settings', requireAuth, requireRole('director'), async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const [maxCheckinsPerDay, maxJournalEntriesPerDay] = await Promise.all([
        getMaxCheckinsPerDay(pool),
        getMaxJournalEntriesPerDay(pool),
      ]);
      res.json({ success: true, maxCheckinsPerDay, maxJournalEntriesPerDay });
    } catch (error) {
      console.error('Get checkin/journal settings error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.put('/director/checkin-journal-settings', requireAuth, requireRole('director'), async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const { maxCheckinsPerDay, maxJournalEntriesPerDay } = req.body;
      const out = {};
      const setNum = async (key, val) => {
        const n = typeof val === 'number' && val >= 1
          ? Math.min(Math.floor(val), 999)
          : Math.min(Math.max(1, parseInt(val, 10) || 1), 999);
        await pool.query(
          `INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, String(n)]
        );
        return n;
      };
      if (typeof maxCheckinsPerDay === 'number' && maxCheckinsPerDay >= 1) {
        out.maxCheckinsPerDay = await setNum('max_checkins_per_day', maxCheckinsPerDay);
      } else if (typeof maxCheckinsPerDay === 'string' && maxCheckinsPerDay.trim() !== '') {
        out.maxCheckinsPerDay = await setNum('max_checkins_per_day', maxCheckinsPerDay);
      }
      if (typeof maxJournalEntriesPerDay === 'number' && maxJournalEntriesPerDay >= 1) {
        out.maxJournalEntriesPerDay = await setNum('max_journal_entries_per_day', maxJournalEntriesPerDay);
      } else if (typeof maxJournalEntriesPerDay === 'string' && maxJournalEntriesPerDay.trim() !== '') {
        out.maxJournalEntriesPerDay = await setNum('max_journal_entries_per_day', maxJournalEntriesPerDay);
      }
      res.json({ success: true, ...out });
    } catch (error) {
      console.error('Update checkin/journal settings error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/class-names', async (req, res) => {
    try {
      if (!pool) return res.json({ success: true, classNames: DEFAULT_CLASS_NAMES });
      const result = await pool.query("SELECT value FROM app_settings WHERE key = 'class_names'");
      if (result.rows.length === 0) return res.json({ success: true, classNames: DEFAULT_CLASS_NAMES });
      const classNames = JSON.parse(result.rows[0].value);
      res.json({ success: true, classNames: classNames.sort() });
    } catch (error) {
      console.error('Get class names error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/director/class-names', requireAuth, requireRole('director'), async (req, res) => {
    try {
      const { className } = req.body;
      if (!className) return res.status(400).json({ success: false, error: 'Missing required fields' });
      if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });

      let currentClassNames = DEFAULT_CLASS_NAMES;
      const result = await pool.query("SELECT value FROM app_settings WHERE key = 'class_names'");
      if (result.rows.length > 0) currentClassNames = JSON.parse(result.rows[0].value);

      const normalizedClassName = className.trim().toUpperCase();
      if (currentClassNames.some((c) => c.toUpperCase() === normalizedClassName)) {
        return res.status(400).json({ success: false, error: 'Class name already exists' });
      }
      currentClassNames.push(className.trim());
      currentClassNames.sort();
      await pool.query(
        `INSERT INTO app_settings (key, value) VALUES ('class_names', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify(currentClassNames)]
      );
      res.json({ success: true, classNames: currentClassNames });
    } catch (error) {
      console.error('Add class name error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.delete('/director/class-names/:className', requireAuth, requireRole('director'), async (req, res) => {
    try {
      const { className } = req.params;
      if (!className) return res.status(400).json({ success: false, error: 'Missing required fields' });
      if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });

      const result = await pool.query("SELECT value FROM app_settings WHERE key = 'class_names'");
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'No class names configured' });
      }
      let currentClassNames = JSON.parse(result.rows[0].value);
      const normalizedClassName = className.trim().toUpperCase();
      const filteredClassNames = currentClassNames.filter((c) => c.toUpperCase() !== normalizedClassName);
      if (filteredClassNames.length === currentClassNames.length) {
        return res.status(404).json({ success: false, error: 'Class name not found' });
      }
      await pool.query(
        `INSERT INTO app_settings (key, value) VALUES ('class_names', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [JSON.stringify(filteredClassNames)]
      );
      res.json({ success: true, classNames: filteredClassNames });
    } catch (error) {
      console.error('Delete class name error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.put('/director/student-class/:studentId', requireAuth, requireRole('director'), async (req, res) => {
    try {
      const { studentId } = req.params;
      const { className } = req.body;
      if (!studentId) return res.status(400).json({ success: false, error: 'Missing required fields' });
      if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });

      const studentResult = await pool.query('SELECT id, user_type FROM users WHERE id = $1', [studentId]);
      if (studentResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Student not found' });
      if (studentResult.rows[0].user_type !== 'student') {
        return res.status(400).json({ success: false, error: 'User is not a student' });
      }
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

  router.put('/director/student-classes', requireAuth, requireRole('director'), async (req, res) => {
    try {
      const { updates } = req.body;
      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
      const results = [];
      for (const update of updates) {
        if (!update.studentId) continue;
        const updateResult = await pool.query(
          'UPDATE users SET class = $1, updated_at = NOW() WHERE id = $2 AND user_type = $3 RETURNING id, first_name, surname, class, house',
          [update.className || null, update.studentId, 'student']
        );
        if (updateResult.rows.length > 0) results.push(updateResult.rows[0]);
      }
      res.json({ success: true, updatedStudents: results, count: results.length });
    } catch (error) {
      console.error('Bulk update student classes error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/director/all-users', requireAuth, requireRole('director'), async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
      const result = await pool.query(
        `SELECT id, first_name, surname, email, user_type, class, house, created_at FROM users
         WHERE user_type IN ('student', 'teacher') ORDER BY user_type, first_name`
      );
      res.json({ success: true, users: result.rows });
    } catch (error) {
      console.error('Director all users error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/director/all-mood-data', requireAuth, requireRole('director'), async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
      const { period = 'daily' } = req.query;
      let whereClause = '';
      if (period === 'daily') whereClause = 'WHERE mc.timestamp >= CURRENT_DATE';
      else if (period === 'weekly') whereClause = 'WHERE mc.timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
      else if (period === 'monthly') whereClause = 'WHERE mc.timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';

      const result = await pool.query(
        `SELECT mc.*, u.first_name, u.surname, u.class, u.house, u.user_type
         FROM mood_checkins mc JOIN users u ON mc.user_id = u.id ${whereClause} ORDER BY mc.timestamp DESC`,
        []
      );
      res.json({ success: true, checkins: result.rows });
    } catch (error) {
      console.error('Director all mood data error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/director/all-journal-entries', requireAuth, requireRole('director'), async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
      const { period = 'daily' } = req.query;
      let whereClause = '';
      if (period === 'daily') whereClause = 'WHERE je.timestamp >= CURRENT_DATE';
      else if (period === 'weekly') whereClause = 'WHERE je.timestamp >= CURRENT_DATE - INTERVAL \'7 days\'';
      else if (period === 'monthly') whereClause = 'WHERE je.timestamp >= CURRENT_DATE - INTERVAL \'30 days\'';

      const result = await pool.query(
        `SELECT je.*, u.first_name, u.surname, u.class, u.house, u.user_type
         FROM journal_entries je JOIN users u ON je.user_id = u.id ${whereClause} ORDER BY je.timestamp DESC`,
        []
      );
      res.json({ success: true, entries: result.rows });
    } catch (error) {
      console.error('Director all journal entries error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/director/house-points', requireAuth, requireRole('director'), async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const result = await pool.query(`
        SELECT u.house, COALESCE(SUM(hp.points), 0) as total_points, COUNT(DISTINCT u.id) as student_count
        FROM users u LEFT JOIN house_points hp ON u.id = hp.user_id
        WHERE u.user_type = 'student' AND u.house IS NOT NULL
        GROUP BY u.house ORDER BY u.house
      `);
      res.json({ success: true, housePoints: result.rows });
    } catch (error) {
      console.error('Get house points totals error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/director/delete-all-student-data', requireAuth, requireRole('director'), async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const countResult = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE user_type = 'student'");
      const count = countResult.rows[0]?.count ?? 0;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const studentIds = await client.query("SELECT id FROM users WHERE user_type = 'student'");
        const ids = (studentIds.rows || []).map((r) => r.id);
        if (ids.length > 0) {
          await client.query('DELETE FROM mood_checkins WHERE user_id = ANY($1::int[])', [ids]);
          await client.query('DELETE FROM journal_entries WHERE user_id = ANY($1::int[])', [ids]);
          await client.query('DELETE FROM house_points WHERE user_id = ANY($1::int[])', [ids]);
          await client.query('DELETE FROM tile_flips WHERE user_id = ANY($1::int[])', [ids]);
          await client.query('DELETE FROM tile_flip_resets WHERE user_id = ANY($1::int[])', [ids]);
          await client.query('DELETE FROM messages WHERE from_user_id = ANY($1::int[]) OR to_user_id = ANY($1::int[])', [ids]);
        }
        await client.query("DELETE FROM users WHERE user_type = 'student'");
        await client.query('COMMIT');
      } catch (txError) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {}
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

  router.post('/director/delete-all-teacher-data', requireAuth, requireRole('director'), async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const countResult = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE user_type = 'teacher'");
      const count = countResult.rows[0]?.count ?? 0;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const teacherIds = await client.query("SELECT id FROM users WHERE user_type = 'teacher'");
        const ids = (teacherIds.rows || []).map((r) => r.id);
        if (ids.length > 0) {
          await client.query('DELETE FROM mood_checkins WHERE user_id = ANY($1::int[])', [ids]);
          await client.query('DELETE FROM journal_entries WHERE user_id = ANY($1::int[])', [ids]);
          await client.query('DELETE FROM tile_flips WHERE user_id = ANY($1::int[])', [ids]);
          await client.query('DELETE FROM tile_flip_resets WHERE user_id = ANY($1::int[])', [ids]);
          await client.query('DELETE FROM messages WHERE from_user_id = ANY($1::int[]) OR to_user_id = ANY($1::int[])', [ids]);
          await client.query('DELETE FROM teacher_assignments WHERE teacher_id = ANY($1::int[])', [ids]);
        }
        await client.query("DELETE FROM users WHERE user_type = 'teacher'");
        await client.query('COMMIT');
      } catch (txError) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {}
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

  router.delete('/director/student/:studentId', requireAuth, requireRole('director'), async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const { studentId } = req.params;
      if (!studentId) return res.status(400).json({ success: false, error: 'Missing required fields' });
      const studentCheck = await pool.query(
        'SELECT id, first_name, surname FROM users WHERE id = $1 AND user_type = $2',
        [studentId, 'student']
      );
      if (studentCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }
      const studentName = `${studentCheck.rows[0].first_name} ${studentCheck.rows[0].surname}`;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM mood_checkins WHERE user_id = $1', [studentId]);
        await client.query('DELETE FROM journal_entries WHERE user_id = $1', [studentId]);
        await client.query('DELETE FROM house_points WHERE user_id = $1', [studentId]);
        await client.query('DELETE FROM tile_flips WHERE user_id = $1', [studentId]);
        await client.query('DELETE FROM tile_flip_resets WHERE user_id = $1', [studentId]);
        await client.query('DELETE FROM messages WHERE from_user_id = $1 OR to_user_id = $1', [studentId]);
        await client.query('DELETE FROM users WHERE id = $1', [studentId]);
        await client.query('COMMIT');
      } catch (txError) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {}
        throw txError;
      } finally {
        client.release();
      }
      res.json({ success: true, message: `Student "${studentName}" has been deleted`, studentId: parseInt(studentId) });
    } catch (error) {
      console.error('Delete individual student error:', error);
      res.status(500).json({ success: false, error: error.message || 'Delete failed' });
    }
  });

  router.post('/director/student/:studentId/reset-password', requireAuth, requireRole('director'), async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const { studentId } = req.params;
      const { newPassword: customPassword } = req.body;
      if (!studentId) return res.status(400).json({ success: false, error: 'Missing required fields' });
      const studentCheck = await pool.query(
        'SELECT id, first_name, surname, email FROM users WHERE id = $1 AND user_type = $2',
        [studentId, 'student']
      );
      if (studentCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }
      const student = studentCheck.rows[0];
      let newPassword;
      if (customPassword && customPassword.trim()) {
        const err = validatePasswordFormat(customPassword.trim());
        if (err) return res.status(400).json({ success: false, error: err });
        newPassword = customPassword.trim();
      } else {
        const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lower = 'abcdefghjkmnpqrstuvwxyz';
        const digits = '23456789';
        const pick = (str) => str[Math.floor(Math.random() * str.length)];
        newPassword =
          pick(upper) +
          pick(lower) +
          pick(digits) +
          Array.from({ length: 5 }, () => pick(upper + lower + digits)).join('');
      }
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, studentId]);
      res.json({ success: true, email: student.email, newPassword, message: 'Password reset successfully.' });
    } catch (error) {
      console.error('Reset student password error:', error);
      res.status(500).json({ success: false, error: error.message || 'Reset failed' });
    }
  });

  router.get('/school-house-points', requireAuth, async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const result = await pool.query(`
        SELECT u.house, COALESCE(SUM(hp.points), 0) as total_points, COUNT(DISTINCT u.id) as student_count
        FROM users u LEFT JOIN house_points hp ON u.id = hp.user_id
        WHERE u.user_type = 'student' AND u.house IS NOT NULL
        GROUP BY u.house ORDER BY u.house
      `);
      res.json({ success: true, housePoints: result.rows });
    } catch (error) {
      console.error('School house points error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/grade-house-points', requireAuth, async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const result = await pool.query(`
        SELECT u.class as grade, COALESCE(SUM(hp.points), 0) as total_points, COUNT(DISTINCT u.id) as student_count
        FROM users u LEFT JOIN house_points hp ON u.id = hp.user_id
        WHERE u.user_type = 'student' AND u.class IS NOT NULL AND u.class != ''
        GROUP BY u.class ORDER BY u.class
      `);
      res.json({ success: true, gradePoints: result.rows });
    } catch (error) {
      console.error('Grade house points error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = { createDirectorRouter };
