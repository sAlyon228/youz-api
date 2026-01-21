const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/stats/dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [users, points, tasks, completed, pending, photos, couriers, purchases] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM points'),
      pool.query('SELECT COUNT(*) as count FROM tasks'),
      pool.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'COMPLETED'"),
      pool.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'PENDING'"),
      pool.query('SELECT COUNT(*) as count FROM workplace_photos WHERE taken_at >= $1', [today.getTime()]),
      pool.query('SELECT COUNT(DISTINCT courier_id) as count FROM courier_locations WHERE timestamp > $1', [Date.now() - 3600000]),
      pool.query('SELECT COUNT(*) as count FROM purchase_requests')
    ]);
    res.json({
      success: true,
      data: {
        totalUsers: parseInt(users.rows[0].count),
        totalPoints: parseInt(points.rows[0].count),
        totalTasks: parseInt(tasks.rows[0].count),
        completedTasks: parseInt(completed.rows[0].count),
        pendingTasks: parseInt(pending.rows[0].count),
        totalPhotosToday: parseInt(photos.rows[0].count),
        activeCouriers: parseInt(couriers.rows[0].count),
        totalPurchaseRequests: parseInt(purchases.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/stats/points
router.get('/points', authenticateToken, async (req, res) => {
  try {
    const { pointId } = req.query;
    const pointsResult = pointId 
      ? await pool.query('SELECT * FROM points WHERE id = $1', [pointId])
      : await pool.query('SELECT * FROM points');
    
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const stats = await Promise.all(pointsResult.rows.map(async point => {
      const [employees, active, tasksT, tasksC, photosT, purchasesT] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM users WHERE point_id = $1', [point.id]),
        pool.query('SELECT COUNT(*) as count FROM users WHERE point_id = $1 AND is_active = true', [point.id]),
        pool.query('SELECT COUNT(*) as count FROM tasks WHERE point_id = $1', [point.id]),
        pool.query("SELECT COUNT(*) as count FROM tasks WHERE point_id = $1 AND status = 'COMPLETED'", [point.id]),
        pool.query('SELECT COUNT(*) as count FROM workplace_photos WHERE point_id = $1 AND taken_at >= $2', [point.id, today.getTime()]),
        pool.query('SELECT COUNT(*) as count FROM purchase_requests WHERE point_id = $1', [point.id])
      ]);
      return {
        pointId: point.id, pointName: point.name,
        totalEmployees: parseInt(employees.rows[0].count),
        activeEmployees: parseInt(active.rows[0].count),
        tasksTotal: parseInt(tasksT.rows[0].count),
        tasksCompleted: parseInt(tasksC.rows[0].count),
        photosToday: parseInt(photosT.rows[0].count),
        purchaseRequests: parseInt(purchasesT.rows[0].count)
      };
    }));
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Point stats error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

module.exports = router;
