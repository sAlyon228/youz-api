const express = require('express');
const bcrypt = require('bcryptjs');
const { data, saveData } = require('../db');
const { formatUser, generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/v1/auth/login
router.post('/login', (req, res) => {
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
    
    const user = data.users.find(u => 
      u.phone.replace(/\D/g, '') === normalizedPhone
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Неверный телефон или пароль' }
      });
    }

    const validPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Неверный телефон или пароль' }
      });
    }

    if (!user.isActive) {
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

// POST /api/v1/auth/register (только для СуперАдмина)
router.post('/register', (req, res) => {
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
    const normalizedPhone = phone.replace(/\D/g, '');
    const existing = data.users.find(u => 
      u.phone.replace(/\D/g, '') === normalizedPhone
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'Пользователь с таким телефоном уже существует' }
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const userRole = role || 'SUPER_ADMIN';

    const newUser = {
      id: ++data._counters.users,
      fullName,
      phone,
      passwordHash,
      role: userRole,
      pointId: null,
      deskId: null,
      isActive: 1,
      avatarUrl: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    data.users.push(newUser);
    saveData();
    
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
