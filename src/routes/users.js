const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { authenticateToken, formatUser } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/users
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows.map(formatUser) });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/users/point/:pointId
router.get('/point/:pointId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE point_id = $1', [req.params.pointId]);
    res.json({ success: true, data: result.rows.map(formatUser) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/users/role/:role
router.get('/role/:role', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE role = $1', [req.params.role]);
    res.json({ success: true, data: result.rows.map(formatUser) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/users/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Пользователь не найден' } });
    }
    res.json({ success: true, data: formatUser(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// POST /api/v1/users
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, role, pointId, isActive } = req.body;
    if (!fullName || !phone) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Заполните обязательные поля' } });
    }
    const passwordHash = bcrypt.hashSync('123456', 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, phone, password_hash, role, point_id, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [fullName, phone, passwordHash, role || 'ENGINEER', pointId || null, isActive !== false]
    );
    res.status(201).json({ success: true, data: formatUser(result.rows[0]) });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// PUT /api/v1/users/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, role, pointId, isActive, deskId, avatarUrl } = req.body;
    const updates = []; const values = []; let idx = 1;
    if (fullName !== undefined) { updates.push(`full_name = $${idx++}`); values.push(fullName); }
    if (phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(phone); }
    if (role !== undefined) { updates.push(`role = $${idx++}`); values.push(role); }
    if (pointId !== undefined) { updates.push(`point_id = $${idx++}`); values.push(pointId); }
    if (deskId !== undefined) { updates.push(`desk_id = $${idx++}`); values.push(deskId); }
    if (isActive !== undefined) { updates.push(`is_active = $${idx++}`); values.push(isActive); }
    if (avatarUrl !== undefined) { updates.push(`avatar_url = $${idx++}`); values.push(avatarUrl); }
    updates.push(`updated_at = $${idx++}`); values.push(Date.now());
    values.push(req.params.id);
    const result = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, values);
    res.json({ success: true, data: formatUser(result.rows[0]) });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// DELETE /api/v1/users/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

module.exports = router;
