const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function formatPhoto(row) {
  return {
    id: row.id,
    userId: row.user_id,
    pointId: row.point_id,
    deskId: row.desk_id,
    photoType: row.photo_type,
    photoPath: row.photo_path,
    photoUrl: row.photo_path,
    takenAt: row.taken_at,
    createdAt: new Date(row.taken_at).toISOString(),
    isSynced: !!row.is_synced
  };
}

// GET /api/v1/photos
router.get('/', authenticateToken, (req, res) => {
  try {
    const photos = db.prepare('SELECT * FROM workplace_photos ORDER BY taken_at DESC').all();
    res.json({ success: true, data: photos.map(formatPhoto) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/photos/user/:userId
router.get('/user/:userId', authenticateToken, (req, res) => {
  try {
    const photos = db.prepare('SELECT * FROM workplace_photos WHERE user_id = ? ORDER BY taken_at DESC').all(req.params.userId);
    res.json({ success: true, data: photos.map(formatPhoto) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/photos/point/:pointId
router.get('/point/:pointId', authenticateToken, (req, res) => {
  try {
    const photos = db.prepare('SELECT * FROM workplace_photos WHERE point_id = ? ORDER BY taken_at DESC').all(req.params.pointId);
    res.json({ success: true, data: photos.map(formatPhoto) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// POST /api/v1/photos/upload
router.post('/upload', authenticateToken, (req, res) => {
  try {
    // Для простоты сохраняем base64 или URL
    const { type, pointId, userId, photoData } = req.body;
    
    const photoPath = photoData || `https://via.placeholder.com/400?text=Photo+${Date.now()}`;
    
    const result = db.prepare(`
      INSERT INTO workplace_photos (user_id, point_id, photo_type, photo_path)
      VALUES (?, ?, ?, ?)
    `).run(userId || req.user.id, pointId || req.user.pointId || 1, type || 'DESK_START', photoPath);

    const photo = db.prepare('SELECT * FROM workplace_photos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: formatPhoto(photo) });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// DELETE /api/v1/photos/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM workplace_photos WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

module.exports = router;
