const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

const VALID_STATUSES = ['todo', 'in_progress', 'review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

router.use(verifyToken);

// 1. Get all tasks for a specific project
router.get('/', (req, res) => {
  const projectId = Number(req.query.projectId);
  if (!Number.isInteger(projectId)) {
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
router.post('/', (req, res) => {
  const { project_id, description, priority, assignee_id, due_date } = req.body;
  const title = (req.body.title || '').trim();

  if (!project_id || !title) {
    return res.status(400).json({ success: false, message: 'Project ID and title are required.' });
  }
  if (title.length > 120) {
    return res.status(400).json({ success: false, message: 'Task title must be 120 characters or less.' });
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ success: false, message: 'Invalid priority.' });
  }

  const query = `
    INSERT INTO tasks (project_id, title, description, priority, assignee_id, due_date, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'todo', ?)
  `;

  db.run(query, [project_id, title, (description || '').trim(), priority || 'medium', assignee_id || null, due_date || null, req.user.id], function (err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to create task.' });
    res.status(201).json({ success: true, taskId: this.lastID });
  });
});

// 3. Update task status (used by drag & drop and the "Move to" menu)
router.patch('/:id/status', (req, res) => {
  const taskId = req.params.id;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid task status.' });
  }

  const query = `UPDATE tasks SET status = ? WHERE id = ?`;
  db.run(query, [status, taskId], function (err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to update status.' });
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'Task not found.' });
    res.json({ success: true, message: `Task moved to ${status}` });
  });
});

// 4. Delete task (only its creator, its assignee, or the project owner)
router.delete('/:id', (req, res) => {
  const taskId = req.params.id;
  const query = `
    SELECT t.created_by, t.assignee_id, p.owner_id
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `;

  db.get(query, [taskId], (err, task) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to delete task.' });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });

    const allowed = [task.created_by, task.assignee_id, task.owner_id].includes(req.user.id);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Only the task creator, assignee, or project owner can delete this task.' });
    }

    db.run(`DELETE FROM tasks WHERE id = ?`, [taskId], function (err) {
      if (err) return res.status(500).json({ success: false, message: 'Failed to delete task.' });
      res.json({ success: true, message: 'Task deleted successfully.' });
    });
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
router.post('/:id/comments', (req, res) => {
  const taskId = req.params.id;
  const content = (req.body.content || '').trim();

  if (!content) {
    return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
  }
  if (content.length > 1000) {
    return res.status(400).json({ success: false, message: 'Comment must be 1000 characters or less.' });
  }

  const query = `INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)`;
  db.run(query, [taskId, req.user.id, content], function (err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to add comment.' });
    res.status(201).json({ success: true, commentId: this.lastID });
  });
});

module.exports = router;