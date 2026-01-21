const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/stats/dashboard
router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalPoints = db.prepare('SELECT COUNT(*) as count FROM points').get().count;
    const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
    const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'COMPLETED'").get().count;
    const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'PENDING'").get().count;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalPhotosToday = db.prepare('SELECT COUNT(*) as count FROM workplace_photos WHERE taken_at >= ?').get(today.getTime()).count;
    
    const activeCouriers = db.prepare(`
      SELECT COUNT(DISTINCT courier_id) as count FROM courier_locations WHERE timestamp > ?
    `).get(Date.now() - 3600000).count;
    
    const totalPurchaseRequests = db.prepare('SELECT COUNT(*) as count FROM purchase_requests').get().count;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPoints,
        totalTasks,
        completedTasks,
        pendingTasks,
        totalPhotosToday,
        activeCouriers,
        totalPurchaseRequests
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/stats/points
router.get('/points', authenticateToken, (req, res) => {
  try {
    const { pointId } = req.query;
    
    let points;
    if (pointId) {
      points = db.prepare('SELECT * FROM points WHERE id = ?').all(pointId);
    } else {
      points = db.prepare('SELECT * FROM points').all();
    }

    const stats = points.map(point => {
      const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM users WHERE point_id = ?').get(point.id).count;
      const activeEmployees = db.prepare('SELECT COUNT(*) as count FROM users WHERE point_id = ? AND is_active = 1').get(point.id).count;
      const tasksTotal = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE point_id = ?').get(point.id).count;
      const tasksCompleted = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE point_id = ? AND status = 'COMPLETED'").get(point.id).count;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const photosToday = db.prepare('SELECT COUNT(*) as count FROM workplace_photos WHERE point_id = ? AND taken_at >= ?').get(point.id, today.getTime()).count;
      const purchaseRequests = db.prepare('SELECT COUNT(*) as count FROM purchase_requests WHERE point_id = ?').get(point.id).count;

      return {
        pointId: point.id,
        pointName: point.name,
        totalEmployees,
        activeEmployees,
        tasksTotal,
        tasksCompleted,
        photosToday,
        purchaseRequests
      };
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Point stats error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

module.exports = router;
