const express = require('express');
const { db } = require('../db');
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
router.post('/location', authenticateToken, (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Укажите координаты' }
      });
    }

    const result = db.prepare(`
      INSERT INTO courier_locations (courier_id, latitude, longitude, accuracy)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, latitude, longitude, accuracy || 0);

    const location = db.prepare('SELECT * FROM courier_locations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: formatLocation(location) });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/courier/active
router.get('/active', authenticateToken, (req, res) => {
  try {
    // Получаем последнюю локацию каждого курьера за последний час
    const locations = db.prepare(`
      SELECT cl.* FROM courier_locations cl
      INNER JOIN (
        SELECT courier_id, MAX(timestamp) as max_ts
        FROM courier_locations
        WHERE timestamp > ?
        GROUP BY courier_id
      ) latest ON cl.courier_id = latest.courier_id AND cl.timestamp = latest.max_ts
    `).all(Date.now() - 3600000); // За последний час
    
    res.json({ success: true, data: locations.map(formatLocation) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/courier/:courierId/history
router.get('/:courierId/history', authenticateToken, (req, res) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM courier_locations WHERE courier_id = ?';
    const params = [req.params.courierId];
    
    if (date) {
      const startOfDay = new Date(date).setHours(0, 0, 0, 0);
      const endOfDay = new Date(date).setHours(23, 59, 59, 999);
      query += ' AND timestamp BETWEEN ? AND ?';
      params.push(startOfDay, endOfDay);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT 100';
    
    const locations = db.prepare(query).all(...params);
    res.json({ success: true, data: locations.map(formatLocation) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

module.exports = router;
