const express = require('express');
const { pool } = require('../db');
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
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM points ORDER BY created_at DESC');
    const points = result.rows;
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
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM points WHERE id = $1', [req.params.id]);
    const point = result.rows[0];
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
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, address, latitude, longitude, openTime, closeTime, workDays, isActive } = req.body;
    
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Заполните обязательные поля' }
      });
    }

    const result = await pool.query(
      `INSERT INTO points (name, address, latitude, longitude, open_time, close_time, work_days, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, address, latitude || null, longitude || null,
       openTime || '09:00', closeTime || '21:00',
       JSON.stringify(workDays || ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY']),
       isActive !== false]
    );

    const newPoint = result.rows[0];
    res.status(201).json({ success: true, data: formatPoint(newPoint) });
  } catch (error) {
    console.error('Create point error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// PUT /api/v1/points/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, address, latitude, longitude, openTime, closeTime, workDays, isActive } = req.body;
    
    const updates = [];
    const values = [];
    let idx = 1;
    
    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (address !== undefined) { updates.push(`address = $${idx++}`); values.push(address); }
    if (latitude !== undefined) { updates.push(`latitude = $${idx++}`); values.push(latitude); }
    if (longitude !== undefined) { updates.push(`longitude = $${idx++}`); values.push(longitude); }
    if (openTime !== undefined) { updates.push(`open_time = $${idx++}`); values.push(openTime); }
    if (closeTime !== undefined) { updates.push(`close_time = $${idx++}`); values.push(closeTime); }
    if (workDays !== undefined) { updates.push(`work_days = $${idx++}`); values.push(JSON.stringify(workDays)); }
    if (isActive !== undefined) { updates.push(`is_active = $${idx++}`); values.push(isActive); }
    
    values.push(req.params.id);

    const result = await pool.query(`UPDATE points SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, values);

    const point = result.rows[0];
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
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM points WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

module.exports = router;
