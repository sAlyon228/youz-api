const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function formatShop(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    workingHours: row.working_hours,
    isActive: !!row.is_active
  };
}

// GET /api/v1/shops
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shops ORDER BY name');
    const shops = result.rows;
    res.json({ success: true, data: shops.map(formatShop) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/shops/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shops WHERE id = $1', [req.params.id]);
    const shop = result.rows[0];
    if (!shop) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Магазин не найден' }
      });
    }
    res.json({ success: true, data: formatShop(shop) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// POST /api/v1/shops
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, address, latitude, longitude, phone, workingHours, isActive } = req.body;
    
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Укажите название и адрес' }
      });
    }

    const result = await pool.query(
      `INSERT INTO shops (name, address, latitude, longitude, phone, working_hours, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, address, latitude || null, longitude || null,
       phone || null, workingHours || null, isActive !== false]
    );

    const newShop = result.rows[0];
    res.status(201).json({ success: true, data: formatShop(newShop) });
  } catch (error) {
    console.error('Create shop error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// PUT /api/v1/shops/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, address, latitude, longitude, phone, workingHours, isActive } = req.body;
    
    const updates = [];
    const values = [];
    let idx = 1;
    
    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (address !== undefined) { updates.push(`address = $${idx++}`); values.push(address); }
    if (latitude !== undefined) { updates.push(`latitude = $${idx++}`); values.push(latitude); }
    if (longitude !== undefined) { updates.push(`longitude = $${idx++}`); values.push(longitude); }
    if (phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(phone); }
    if (workingHours !== undefined) { updates.push(`working_hours = $${idx++}`); values.push(workingHours); }
    if (isActive !== undefined) { updates.push(`is_active = $${idx++}`); values.push(isActive); }
    
    values.push(req.params.id);

    const result = await pool.query(`UPDATE shops SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, values);

    const shop = result.rows[0];
    res.json({ success: true, data: formatShop(shop) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// DELETE /api/v1/shops/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM shops WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

module.exports = router;
