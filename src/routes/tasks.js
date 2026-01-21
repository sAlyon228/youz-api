const express = require('express');
const { pool } = require('../db');
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

// GET /api/v1/tasks/user/:userId
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE assigned_to_user_id = $1 ORDER BY created_at DESC', [req.params.userId]);
    res.json({ success: true, data: result.rows.map(formatTask) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/tasks/point/:pointId
router.get('/point/:pointId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE point_id = $1 ORDER BY created_at DESC', [req.params.pointId]);
    res.json({ success: true, data: result.rows.map(formatTask) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/tasks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows.map(formatTask) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// GET /api/v1/tasks/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Задача не найдена' } });
    }
    res.json({ success: true, data: formatTask(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// POST /api/v1/tasks
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, orderNumber, assignedToUserId, assignedToRole, pointId, status, templateId, dueDate } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Укажите название задачи' } });
    }
    const result = await pool.query(
      `INSERT INTO tasks (title, description, order_number, assigned_to_user_id, assigned_to_role, point_id, created_by_user_id, status, template_id, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, description || null, orderNumber || null, assignedToUserId || null, assignedToRole || null, pointId || null, req.user.id, status || 'PENDING', templateId || null, dueDate || null]
    );
    res.status(201).json({ success: true, data: formatTask(result.rows[0]) });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// PUT /api/v1/tasks/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, orderNumber, assignedToUserId, assignedToRole, pointId, status, dueDate } = req.body;
    const updates = []; const values = []; let idx = 1;
    if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (orderNumber !== undefined) { updates.push(`order_number = $${idx++}`); values.push(orderNumber); }
    if (assignedToUserId !== undefined) { updates.push(`assigned_to_user_id = $${idx++}`); values.push(assignedToUserId); }
    if (assignedToRole !== undefined) { updates.push(`assigned_to_role = $${idx++}`); values.push(assignedToRole); }
    if (pointId !== undefined) { updates.push(`point_id = $${idx++}`); values.push(pointId); }
    if (status !== undefined) { 
      updates.push(`status = $${idx++}`); values.push(status);
      if (status === 'COMPLETED') { updates.push(`completed_at = $${idx++}`); values.push(Date.now()); }
    }
    if (dueDate !== undefined) { updates.push(`due_date = $${idx++}`); values.push(dueDate); }
    values.push(req.params.id);
    const result = await pool.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, values);
    res.json({ success: true, data: formatTask(result.rows[0]) });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

// DELETE /api/v1/tasks/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: null });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Ошибка сервера' } });
  }
});

module.exports = router;
