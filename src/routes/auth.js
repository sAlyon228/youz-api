const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { formatUser, generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Введите телефон и пароль' }
      });
    }

    // Нормализуем телефон
    const normalizedPhone = phone.replace(/\D/g, '');
    
    const result = await pool.query(
      `SELECT * FROM users WHERE REPLACE(phone, '+', '') = $1 OR phone = $2`,
      [normalizedPhone, phone]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Неверный телефон или пароль' }
      });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Неверный телефон или пароль' }
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: { code: 'USER_INACTIVE', message: 'Аккаунт деактивирован' }
      });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      data: {
        token,
        user: formatUser(user)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  try {
    const { fullName, phone, password, role } = req.body;

    if (!fullName || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Заполните все поля' }
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'Пароль должен быть минимум 6 символов' }
      });
    }

    // Проверяем существует ли пользователь
    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'Пользователь с таким телефоном уже существует' }
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const userRole = role || 'SUPER_ADMIN';

    const result = await pool.query(
      `INSERT INTO users (full_name, phone, password_hash, role, is_active) 
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [fullName, phone, passwordHash, userRole]
    );
    
    const newUser = result.rows[0];
    const token = generateToken(newUser.id);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: formatUser(newUser)
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  res.json({ success: true, data: null });
});

module.exports = router;
