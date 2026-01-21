const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function formatPurchase(row) {
  return {
    id: row.id,
    pointId: row.point_id,
    shopId: row.shop_id,
    createdByUserId: row.created_by_user_id,
    assignedCourierId: row.assigned_courier_id,
    items: row.items,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    title: row.items,
    description: row.notes
  };
}

// GET /api/v1/purchases/courier/:courierId
router.get('/courier/:courierId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM purchase_requests WHERE assigned_courier_id = $1 ORDER BY created_at DESC', [req.params.courierId]);
    res.json({ success: true, data: result.rows.map(formatPurchase) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/purchases
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM purchase_requests ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows.map(formatPurchase) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/purchases/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM purchase_requests WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Заявка не найдена' } });
    }
    res.json({ success: true, data: formatPurchase(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// POST /api/v1/purchases
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { pointId, shopId, items, notes, status } = req.body;
    if (!items) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Укажите список товаров' } });
    }
    const result = await pool.query(
      `INSERT INTO purchase_requests (point_id, shop_id, created_by_user_id, items, notes, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [pointId || 1, shopId || 1, req.user.id, items, notes || null, status || 'PENDING']
    );
    res.status(201).json({ success: true, data: formatPurchase(result.rows[0]) });
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// PUT /api/v1/purchases/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { pointId, shopId, assignedCourierId, items, notes, status } = req.body;
    const updates = []; const values = []; let idx = 1;
    if (pointId !== undefined) { updates.push(`point_id = $${idx++}`); values.push(pointId); }
    if (shopId !== undefined) { updates.push(`shop_id = $${idx++}`); values.push(shopId); }
    if (assignedCourierId !== undefined) { updates.push(`assigned_courier_id = $${idx++}`); values.push(assignedCourierId); }
    if (items !== undefined) { updates.push(`items = $${idx++}`); values.push(items); }
    if (notes !== undefined) { updates.push(`notes = $${idx++}`); values.push(notes); }
    if (status !== undefined) { 
      updates.push(`status = $${idx++}`); values.push(status);
      if (status === 'COMPLETED' || status === 'PURCHASED') { updates.push(`completed_at = $${idx++}`); values.push(Date.now()); }
    }
    values.push(req.params.id);
    const result = await pool.query(`UPDATE purchase_requests SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, values);
    res.json({ success: true, data: formatPurchase(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// DELETE /api/v1/purchases/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM purchase_requests WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

module.exports = router;
