const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function formatPoint(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    openTime: row.open_time,
    closeTime: row.close_time,
    workDays: JSON.parse(row.work_days || '[]'),
    isActive: !!row.is_active,
    createdAt: row.created_at
  };
}

// GET /api/v1/points
router.get('/', authenticateToken, (req, res) => {
  try {
    const points = db.prepare('SELECT * FROM points ORDER BY name').all();
    res.json({ success: true, data: points.map(formatPoint) });
  } catch (error) {
    console.error('Get points error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/points/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const point = db.prepare('SELECT * FROM points WHERE id = ?').get(req.params.id);
    if (!point) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Точка не найдена' }
      });
    }
    res.json({ success: true, data: formatPoint(point) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// POST /api/v1/points
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, address, latitude, longitude, openTime, closeTime, workDays, isActive } = req.body;
    
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Укажите название и адрес' }
      });
    }

    const result = db.prepare(`
      INSERT INTO points (name, address, latitude, longitude, open_time, close_time, work_days, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, 
      address, 
      latitude || null, 
      longitude || null, 
      openTime || '09:00', 
      closeTime || '21:00',
      JSON.stringify(workDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']),
      isActive !== false ? 1 : 0
    );

    const point = db.prepare('SELECT * FROM points WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: formatPoint(point) });
  } catch (error) {
    console.error('Create point error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// PUT /api/v1/points/:id
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, address, latitude, longitude, openTime, closeTime, workDays, isActive } = req.body;
    
    const updates = [];
    const values = [];
    
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (address !== undefined) { updates.push('address = ?'); values.push(address); }
    if (latitude !== undefined) { updates.push('latitude = ?'); values.push(latitude); }
    if (longitude !== undefined) { updates.push('longitude = ?'); values.push(longitude); }
    if (openTime !== undefined) { updates.push('open_time = ?'); values.push(openTime); }
    if (closeTime !== undefined) { updates.push('close_time = ?'); values.push(closeTime); }
    if (workDays !== undefined) { updates.push('work_days = ?'); values.push(JSON.stringify(workDays)); }
    if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive ? 1 : 0); }
    
    values.push(req.params.id);

    if (updates.length > 0) {
      db.prepare(`UPDATE points SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const point = db.prepare('SELECT * FROM points WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: formatPoint(point) });
  } catch (error) {
    console.error('Update point error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// DELETE /api/v1/points/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM points WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

module.exports = router;
