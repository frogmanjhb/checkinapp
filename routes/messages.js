/**
 * Message centre routes: send, list, mark read, unread count.
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');

function createMessagesRouter({ pool, settings, config, messageLimiter }) {
  const router = express.Router();
  const getMessageCenterEnabled = settings.getMessageCenterEnabled;

  const postMessagesHandler = async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    const enabled = await getMessageCenterEnabled(pool);
    if (!enabled) {
      return res.status(503).json({ success: false, error: 'Message center is currently disabled' });
    }
    try {
      const fromUserId = req.user.id;
      const { toUserId, message } = req.body;
      if (!toUserId || !message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      const messageText = message.trim();
      if (messageText.length === 0 || messageText.length > 5000) {
        return res.status(400).json({ success: false, error: 'Message must be 1–5000 characters' });
      }

      const directorEmail = config.demo.directorEmail;
      const directorResult = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND user_type = $2',
        [directorEmail, 'director']
      );
      const directorId = directorResult.rows.length > 0 ? directorResult.rows[0].id : null;

      const teacherMessageResult = await pool.query(
        'INSERT INTO messages (from_user_id, to_user_id, message) VALUES ($1, $2, $3) RETURNING *',
        [fromUserId, toUserId, messageText]
      );

      let directorMessage = null;
      if (directorId) {
        const directorMessageResult = await pool.query(
          'INSERT INTO messages (from_user_id, to_user_id, message, thread_id) VALUES ($1, $2, $3, $4) RETURNING *',
          [fromUserId, directorId, messageText, teacherMessageResult.rows[0].id]
        );
        directorMessage = directorMessageResult.rows[0];
      }

      res.status(201).json({
        success: true,
        message: teacherMessageResult.rows[0],
        directorMessage,
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  if (messageLimiter) {
    router.post('/messages', messageLimiter, requireAuth, postMessagesHandler);
  } else {
    router.post('/messages', requireAuth, postMessagesHandler);
  }

  router.get('/messages/:userId', requireAuth, async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    const enabled = await getMessageCenterEnabled(pool);
    if (!enabled) {
      return res.status(503).json({ success: false, error: 'Message center is currently disabled' });
    }
    try {
      const userId = req.user.id;
      if (parseInt(req.params.userId, 10) !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const result = await pool.query(
        `SELECT m.*,
                from_user.first_name as from_first_name, from_user.surname as from_surname, from_user.user_type as from_user_type,
                to_user.first_name as to_first_name, to_user.surname as to_surname, to_user.user_type as to_user_type
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

  router.put('/messages/:messageId/read', requireAuth, async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const enabled = await getMessageCenterEnabled(pool);
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

  router.get('/messages/:userId/unread-count', requireAuth, async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    const enabled = await getMessageCenterEnabled(pool);
    if (!enabled) {
      return res.status(503).json({ success: false, error: 'Message center is currently disabled' });
    }
    try {
      const userId = req.user.id;
      if (parseInt(req.params.userId, 10) !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
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

  return router;
}

module.exports = { createMessagesRouter };
