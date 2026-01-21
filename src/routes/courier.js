const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function formatLocation(row) {
  return {
    id: row.id,
    courierId: row.courier_id,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    timestamp: row.timestamp
  };
}

// POST /api/v1/courier/location
router.post('/location', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Укажите координаты' } });
    }
    const result = await pool.query(
      `INSERT INTO courier_locations (courier_id, latitude, longitude, accuracy) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, latitude, longitude, accuracy || 0]
    );
    res.status(201).json({ success: true, data: formatLocation(result.rows[0]) });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/courier/active
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (courier_id) * FROM courier_locations 
      WHERE timestamp > $1 ORDER BY courier_id, timestamp DESC
    `, [Date.now() - 3600000]);
    res.json({ success: true, data: result.rows.map(formatLocation) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/courier/:courierId/history
router.get('/:courierId/history', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM courier_locations WHERE courier_id = $1';
    const params = [req.params.courierId];
    if (date) {
      const startOfDay = new Date(date).setHours(0, 0, 0, 0);
      const endOfDay = new Date(date).setHours(23, 59, 59, 999);
      query += ' AND timestamp BETWEEN $2 AND $3';
      params.push(startOfDay, endOfDay);
    }
    query += ' ORDER BY timestamp DESC LIMIT 100';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows.map(formatLocation) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

module.exports = router;
