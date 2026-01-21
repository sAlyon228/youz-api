const jwt = require('jsonwebtoken');
const { data } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'youz-super-secret-key-change-in-production';

function authenticateToken(req, res, next) {
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
    const user = data.users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Пользователь не найден' }
      });
    }

    if (!user.isActive) {
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

function formatUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    pointId: user.pointId,
    deskId: user.deskId,
    isActive: !!user.isActive,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { authenticateToken, formatUser, generateToken, JWT_SECRET };
