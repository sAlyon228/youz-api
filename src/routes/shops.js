const express = require('express');
const { db } = require('../db');
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
router.get('/', authenticateToken, (req, res) => {
  try {
    const shops = db.prepare('SELECT * FROM shops ORDER BY name').all();
    res.json({ success: true, data: shops.map(formatShop) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/shops/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
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
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, address, latitude, longitude, phone, workingHours, isActive } = req.body;
    
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Укажите название и адрес' }
      });
    }

    const result = db.prepare(`
      INSERT INTO shops (name, address, latitude, longitude, phone, working_hours, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, address, latitude || null, longitude || null, phone || null, workingHours || null, isActive !== false ? 1 : 0);

    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: formatShop(shop) });
  } catch (error) {
    console.error('Create shop error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// PUT /api/v1/shops/:id
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, address, latitude, longitude, phone, workingHours, isActive } = req.body;
    
    const updates = [];
    const values = [];
    
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (address !== undefined) { updates.push('address = ?'); values.push(address); }
    if (latitude !== undefined) { updates.push('latitude = ?'); values.push(latitude); }
    if (longitude !== undefined) { updates.push('longitude = ?'); values.push(longitude); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (workingHours !== undefined) { updates.push('working_hours = ?'); values.push(workingHours); }
    if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive ? 1 : 0); }
    
    values.push(req.params.id);

    if (updates.length > 0) {
      db.prepare(`UPDATE shops SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: formatShop(shop) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// DELETE /api/v1/shops/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM shops WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

module.exports = router;
