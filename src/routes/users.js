const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authenticateToken, formatUser } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/users
router.get('/', authenticateToken, (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    res.json({
      success: true,
      data: users.map(formatUser)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/users/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Пользователь не найден' }
      });
    }
    res.json({ success: true, data: formatUser(user) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// POST /api/v1/users
router.post('/', authenticateToken, (req, res) => {
  try {
    const { fullName, phone, role, pointId, isActive } = req.body;
    
    if (!fullName || !phone) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Заполните обязательные поля' }
      });
    }

    const passwordHash = bcrypt.hashSync('123456', 10); // Дефолтный пароль

    const result = db.prepare(`
      INSERT INTO users (full_name, phone, password_hash, role, point_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(fullName, phone, passwordHash, role || 'ENGINEER', pointId || null, isActive !== false ? 1 : 0);

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: formatUser(newUser) });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// PUT /api/v1/users/:id
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { fullName, phone, role, pointId, isActive, deskId, avatarUrl } = req.body;
    
    const updates = [];
    const values = [];
    
    if (fullName !== undefined) { updates.push('full_name = ?'); values.push(fullName); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (role !== undefined) { updates.push('role = ?'); values.push(role); }
    if (pointId !== undefined) { updates.push('point_id = ?'); values.push(pointId); }
    if (deskId !== undefined) { updates.push('desk_id = ?'); values.push(deskId); }
    if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive ? 1 : 0); }
    if (avatarUrl !== undefined) { updates.push('avatar_url = ?'); values.push(avatarUrl); }
    
    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(req.params.id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: formatUser(user) });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// DELETE /api/v1/users/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/users/point/:pointId
router.get('/point/:pointId', authenticateToken, (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users WHERE point_id = ?').all(req.params.pointId);
    res.json({ success: true, data: users.map(formatUser) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/users/role/:role
router.get('/role/:role', authenticateToken, (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users WHERE role = ?').all(req.params.role);
    res.json({ success: true, data: users.map(formatUser) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

module.exports = router;
