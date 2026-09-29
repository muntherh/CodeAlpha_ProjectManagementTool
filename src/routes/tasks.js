const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

// 1. Get all tasks for a specific project
router.get('/', (req, res) => {
  const projectId = req.query.projectId;
  if (!projectId) {
    return res.status(400).json({ success: false, message: 'Project ID is required.' });
  }

  const query = `
    SELECT 
      t.*,
      u.name AS assignee_name, u.avatar_url AS assignee_avatar,
      (SELECT COUNT(*) FROM comments WHERE task_id = t.id) AS comments_count
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.project_id = ?
    ORDER BY t.id ASC
  `;

  db.all(query, [projectId], (err, tasks) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to load tasks.' });
    res.json({ success: true, tasks });
  });
});

// 2. Create a new task card
router.post('/', verifyToken, (req, res) => {
  const { project_id, title, description, priority, assignee_id, due_date } = req.body;

  if (!project_id || !title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Project ID and title are required.' });
  }

  const query = `
    INSERT INTO tasks (project_id, title, description, priority, assignee_id, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, 'todo')
  `;

  db.run(query, [project_id, title.trim(), description || '', priority || 'medium', assignee_id || null, due_date || null], function (err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to create task.' });
    res.status(201).json({ success: true, taskId: this.lastID });
  });
});

// 3. Update task status (Crucial for Drag & Drop Kanban events!)
router.patch('/:id/status', verifyToken, (req, res) => {
  const taskId = req.params.id;
  const { status } = req.body;

  const validStatuses = ['todo', 'in_progress', 'review', 'done'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid task status.' });
  }

  const query = `UPDATE tasks SET status = ? WHERE id = ?`;
  db.run(query, [status, taskId], function (err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to update status.' });
    res.json({ success: true, message: `Task moved to ${status}` });
  });
});

// 4. Delete task
router.delete('/:id', verifyToken, (req, res) => {
  const taskId = req.params.id;
  db.run(`DELETE FROM tasks WHERE id = ?`, [taskId], function (err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to delete task.' });
    res.json({ success: true, message: 'Task deleted successfully.' });
  });
});

// 5. Get Comments for a specific task card
router.get('/:id/comments', (req, res) => {
  const taskId = req.params.id;
  const query = `
    SELECT c.*, u.name AS user_name, u.avatar_url AS user_avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ?
    ORDER BY c.id ASC
  `;
  db.all(query, [taskId], (err, comments) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to load comments.' });
    res.json({ success: true, comments });
  });
});

// 6. Post a comment inside a task
router.post('/:id/comments', verifyToken, (req, res) => {
  const taskId = req.params.id;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
  }

  const query = `INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)`;
  db.run(query, [taskId, req.user.id, content.trim()], function (err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to add comment.' });
    res.status(201).json({ success: true, commentId: this.lastID });
  });
});

module.exports = router;