const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function formatTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    orderNumber: row.order_number,
    assignedToUserId: row.assigned_to_user_id,
    assignedToRole: row.assigned_to_role,
    pointId: row.point_id,
    createdByUserId: row.created_by_user_id,
    status: row.status,
    templateId: row.template_id,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at
  };
}

// GET /api/v1/tasks
router.get('/', authenticateToken, (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
    res.json({ success: true, data: tasks.map(formatTask) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/tasks/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Задача не найдена' }
      });
    }
    res.json({ success: true, data: formatTask(task) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// POST /api/v1/tasks
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, description, orderNumber, assignedToUserId, assignedToRole, pointId, status, templateId, dueDate } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Укажите название задачи' }
      });
    }

    const result = db.prepare(`
      INSERT INTO tasks (title, description, order_number, assigned_to_user_id, assigned_to_role, point_id, created_by_user_id, status, template_id, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description || null,
      orderNumber || null,
      assignedToUserId || null,
      assignedToRole || null,
      pointId || null,
      req.user.id,
      status || 'PENDING',
      templateId || null,
      dueDate || null
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: formatTask(task) });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// PUT /api/v1/tasks/:id
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { title, description, orderNumber, assignedToUserId, assignedToRole, pointId, status, dueDate } = req.body;
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (orderNumber !== undefined) { updates.push('order_number = ?'); values.push(orderNumber); }
    if (assignedToUserId !== undefined) { updates.push('assigned_to_user_id = ?'); values.push(assignedToUserId); }
    if (assignedToRole !== undefined) { updates.push('assigned_to_role = ?'); values.push(assignedToRole); }
    if (pointId !== undefined) { updates.push('point_id = ?'); values.push(pointId); }
    if (status !== undefined) { 
      updates.push('status = ?'); 
      values.push(status);
      if (status === 'COMPLETED') {
        updates.push('completed_at = ?');
        values.push(Date.now());
      }
    }
    if (dueDate !== undefined) { updates.push('due_date = ?'); values.push(dueDate); }
    
    values.push(req.params.id);

    if (updates.length > 0) {
      db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: formatTask(task) });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// DELETE /api/v1/tasks/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/tasks/user/:userId
router.get('/user/:userId', authenticateToken, (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks WHERE assigned_to_user_id = ? ORDER BY created_at DESC').all(req.params.userId);
    res.json({ success: true, data: tasks.map(formatTask) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

// GET /api/v1/tasks/point/:pointId
router.get('/point/:pointId', authenticateToken, (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks WHERE point_id = ? ORDER BY created_at DESC').all(req.params.pointId);
    res.json({ success: true, data: tasks.map(formatTask) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' }
    });
  }
});

module.exports = router;
