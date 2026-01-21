const express = require('express');
const { pool } = require('../db');
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

// GET /api/v1/photos/user/:userId
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workplace_photos WHERE user_id = $1 ORDER BY taken_at DESC', [req.params.userId]);
    res.json({ success: true, data: result.rows.map(formatPhoto) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/photos/point/:pointId
router.get('/point/:pointId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workplace_photos WHERE point_id = $1 ORDER BY taken_at DESC', [req.params.pointId]);
    res.json({ success: true, data: result.rows.map(formatPhoto) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/photos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workplace_photos ORDER BY taken_at DESC');
    res.json({ success: true, data: result.rows.map(formatPhoto) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// POST /api/v1/photos/upload
router.post('/upload', authenticateToken, async (req, res) => {
  try {
    const { type, pointId, userId, photoData } = req.body;
    const photoPath = photoData || `https://via.placeholder.com/400?text=Photo+${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO workplace_photos (user_id, point_id, photo_type, photo_path) VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId || req.user.id, pointId || req.user.pointId || 1, type || 'DESK_START', photoPath]
    );
    res.status(201).json({ success: true, data: formatPhoto(result.rows[0]) });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// DELETE /api/v1/photos/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM workplace_photos WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

module.exports = router;
