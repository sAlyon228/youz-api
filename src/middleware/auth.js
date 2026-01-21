const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'youz-super-secret-key-change-in-production';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Требуется авторизация' }
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Пользователь не найден' }
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: { code: 'USER_INACTIVE', message: 'Аккаунт деактивирован' }
      });
    }

    req.user = formatUser(user);
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Недействительный токен' }
    });
  }
}

function formatUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    pointId: row.point_id,
    deskId: row.desk_id,
    isActive: !!row.is_active,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { authenticateToken, formatUser, generateToken, JWT_SECRET };
