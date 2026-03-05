/**
 * Tile flip and director tile-quotes routes.
 */
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

function createTilesRouter({ pool, housePoints }) {
  const router = express.Router();

  router.get('/tile-flip/quotes', requireAuth, async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const result = await pool.query(
        'SELECT quote_index, quote_text, author FROM tile_quotes ORDER BY quote_index ASC'
      );
      res.json({ success: true, quotes: result.rows });
    } catch (error) {
      console.error('Get tile quotes error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/tile-flip/status/:userId', requireAuth, async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const userId = req.user.id;
      if (parseInt(req.params.userId, 10) !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      const flippedResult = await pool.query('SELECT tile_index FROM tile_flips WHERE user_id = $1', [userId]);
      const flippedTiles = flippedResult.rows.map((row) => row.tile_index);

      const journalResult = await pool.query(
        'SELECT COUNT(*)::int AS count FROM journal_entries WHERE user_id = $1',
        [userId]
      );
      const journalCount = journalResult.rows[0]?.count || 0;

      const resetResult = await pool.query(
        'SELECT reset_at, next_quote_index FROM tile_flip_resets WHERE user_id = $1',
        [userId]
      );
      let nextQuoteIndex = 0;
      let resetAt = null;
      let shouldReset = false;
      if (resetResult.rows.length > 0) {
        nextQuoteIndex = resetResult.rows[0].next_quote_index;
        resetAt = resetResult.rows[0].reset_at;
        if (flippedTiles.length === 12 && resetAt) {
          const resetDate = new Date(resetAt);
          const oneDayLater = new Date(resetDate.getTime() + 24 * 60 * 60 * 1000);
          if (new Date() >= oneDayLater) shouldReset = true;
        }
      }
      const availableFlips = Math.max(0, journalCount - flippedTiles.length);
      res.json({ success: true, flippedTiles, availableFlips, shouldReset, resetAt, nextQuoteIndex });
    } catch (error) {
      console.error('Get tile flip status error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/tile-flip/flip', requireAuth, async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const userId = req.user.id;
      const { tileIndex } = req.body;
      if (tileIndex == null) return res.status(400).json({ success: false, error: 'Missing required fields' });
      if (tileIndex < 0 || tileIndex > 11) {
        return res.status(400).json({ success: false, error: 'Invalid tile index' });
      }
      const existingFlip = await pool.query(
        'SELECT id FROM tile_flips WHERE user_id = $1 AND tile_index = $2',
        [userId, tileIndex]
      );
      if (existingFlip.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Tile already flipped' });
      }

      const journalResult = await pool.query(
        'SELECT COUNT(*)::int AS count FROM journal_entries WHERE user_id = $1',
        [userId]
      );
      const journalCount = journalResult.rows[0]?.count || 0;
      const flippedResult = await pool.query(
        'SELECT COUNT(*)::int AS count FROM tile_flips WHERE user_id = $1',
        [userId]
      );
      const flippedCount = flippedResult.rows[0]?.count || 0;
      if (journalCount <= flippedCount) {
        return res.status(400).json({
          success: false,
          error: 'No available flips. Complete a journal entry to earn a flip.',
        });
      }

      let resetRecord = await pool.query(
        'SELECT next_quote_index FROM tile_flip_resets WHERE user_id = $1',
        [userId]
      );
      let quoteIndex;
      if (resetRecord.rows.length === 0) {
        quoteIndex = 0;
        await pool.query(
          'INSERT INTO tile_flip_resets (user_id, next_quote_index) VALUES ($1, $2)',
          [userId, 1]
        );
      } else {
        quoteIndex = resetRecord.rows[0].next_quote_index;
        const nextIndex = (quoteIndex + 1) % 50;
        await pool.query(
          'UPDATE tile_flip_resets SET next_quote_index = $1 WHERE user_id = $2',
          [nextIndex, userId]
        );
      }

      const quoteResult = await pool.query(
        'SELECT quote_text, author FROM tile_quotes WHERE quote_index = $1',
        [quoteIndex]
      );
      if (quoteResult.rows.length === 0) {
        return res.status(500).json({ success: false, error: 'Quote not found' });
      }
      const quote = quoteResult.rows[0];

      await pool.query(
        'INSERT INTO tile_flips (user_id, tile_index, quote_index) VALUES ($1, $2, $3)',
        [userId, tileIndex, quoteIndex]
      );
      await housePoints.awardHousePoints(pool, userId, 1);

      const allFlippedResult = await pool.query(
        'SELECT COUNT(*)::int AS count FROM tile_flips WHERE user_id = $1',
        [userId]
      );
      const allFlippedCount = allFlippedResult.rows[0]?.count || 0;
      if (allFlippedCount === 12) {
        await pool.query(
          `INSERT INTO tile_flip_resets (user_id, reset_at, next_quote_index)
           VALUES ($1, CURRENT_TIMESTAMP, $2)
           ON CONFLICT (user_id) DO UPDATE SET reset_at = CURRENT_TIMESTAMP`,
          [userId, (quoteIndex + 1) % 50]
        );
      }

      const updatedFlippedResult = await pool.query(
        'SELECT tile_index FROM tile_flips WHERE user_id = $1',
        [userId]
      );
      const updatedFlippedTiles = updatedFlippedResult.rows.map((row) => row.tile_index);
      const updatedAvailableFlips = Math.max(0, journalCount - updatedFlippedTiles.length);

      res.json({
        success: true,
        quote: { text: quote.quote_text, author: quote.author },
        flippedTiles: updatedFlippedTiles,
        availableFlips: updatedAvailableFlips,
      });
    } catch (error) {
      console.error('Flip tile error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/tile-flip/reset/:userId', requireAuth, async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const userId = req.user.id;
      if (parseInt(req.params.userId, 10) !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
      await pool.query('DELETE FROM tile_flips WHERE user_id = $1', [userId]);
      await pool.query(
        `INSERT INTO tile_flip_resets (user_id, reset_at, next_quote_index)
         VALUES ($1, CURRENT_TIMESTAMP, $2)
         ON CONFLICT (user_id) DO UPDATE SET reset_at = CURRENT_TIMESTAMP, next_quote_index = $2`,
        [userId, 0]
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Reset tiles error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/director/tile-quotes', requireAuth, requireRole('director'), async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const result = await pool.query(
        'SELECT quote_index, quote_text, author FROM tile_quotes ORDER BY quote_index ASC'
      );
      res.json({ success: true, quotes: result.rows });
    } catch (error) {
      console.error('Get tile quotes error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.put('/director/tile-quotes', requireAuth, requireRole('director'), async (req, res) => {
    if (!pool) return res.status(503).json({ success: false, error: 'Database not available' });
    try {
      const { quotes } = req.body;
      if (!quotes || !Array.isArray(quotes)) {
        return res.status(400).json({ success: false, error: 'Missing or invalid quotes array' });
      }
      for (const quote of quotes) {
        if (quote.quoteIndex == null || quote.quoteText == null) continue;
        await pool.query(
          `UPDATE tile_quotes SET quote_text = $1, author = $2, updated_at = CURRENT_TIMESTAMP WHERE quote_index = $3`,
          [quote.quoteText, quote.author || null, quote.quoteIndex]
        );
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Update tile quotes error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = { createTilesRouter };
