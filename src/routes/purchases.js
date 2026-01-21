const express = require('express');
const { db } = require('../db');
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

// GET /api/v1/purchases
router.get('/', authenticateToken, (req, res) => {
  try {
    const purchases = db.prepare('SELECT * FROM purchase_requests ORDER BY created_at DESC').all();
    res.json({ success: true, data: purchases.map(formatPurchase) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/purchases/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const purchase = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(req.params.id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Заявка не найдена' }
      });
    }
    res.json({ success: true, data: formatPurchase(purchase) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// POST /api/v1/purchases
router.post('/', authenticateToken, (req, res) => {
  try {
    const { pointId, shopId, items, notes, status } = req.body;
    
    if (!items) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Укажите список товаров' }
      });
    }

    const result = db.prepare(`
      INSERT INTO purchase_requests (point_id, shop_id, created_by_user_id, items, notes, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(pointId || 1, shopId || 1, req.user.id, items, notes || null, status || 'PENDING');

    const purchase = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: formatPurchase(purchase) });
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// PUT /api/v1/purchases/:id
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { pointId, shopId, assignedCourierId, items, notes, status } = req.body;
    
    const updates = [];
    const values = [];
    
    if (pointId !== undefined) { updates.push('point_id = ?'); values.push(pointId); }
    if (shopId !== undefined) { updates.push('shop_id = ?'); values.push(shopId); }
    if (assignedCourierId !== undefined) { updates.push('assigned_courier_id = ?'); values.push(assignedCourierId); }
    if (items !== undefined) { updates.push('items = ?'); values.push(items); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    if (status !== undefined) { 
      updates.push('status = ?'); 
      values.push(status);
      if (status === 'COMPLETED' || status === 'PURCHASED') {
        updates.push('completed_at = ?');
        values.push(Date.now());
      }
    }
    
    values.push(req.params.id);

    if (updates.length > 0) {
      db.prepare(`UPDATE purchase_requests SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const purchase = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: formatPurchase(purchase) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// DELETE /api/v1/purchases/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM purchase_requests WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/purchases/courier/:courierId
router.get('/courier/:courierId', authenticateToken, (req, res) => {
  try {
    const purchases = db.prepare('SELECT * FROM purchase_requests WHERE assigned_courier_id = ? ORDER BY created_at DESC').all(req.params.courierId);
    res.json({ success: true, data: purchases.map(formatPurchase) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

module.exports = router;
