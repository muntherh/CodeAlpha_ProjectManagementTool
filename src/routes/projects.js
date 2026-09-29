const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

// Get all projects
router.get('/', (req, res) => {
  const query = `
    SELECT p.*, u.name AS owner_name,
    (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) AS tasks_count
    FROM projects p
    JOIN users u ON p.owner_id = u.id
    ORDER BY p.id DESC
  `;
  db.all(query, [], (err, projects) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to fetch projects.' });
    res.json({ success: true, projects });
  });
});

// Create new group project
router.post('/', verifyToken, (req, res) => {
  const { title, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Project title is required.' });
  }

  const query = `INSERT INTO projects (title, description, owner_id) VALUES (?, ?, ?)`;
  db.run(query, [title.trim(), description || '', req.user.id], function (err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to create project.' });
    res.status(201).json({ success: true, message: 'Project created!', projectId: this.lastID });
  });
});

module.exports = router;