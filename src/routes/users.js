const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/auth');

// Get all team members for task assignment dropdown (no emails exposed)
router.get('/', verifyToken, (req, res) => {
  const query = `SELECT id, name, avatar_url FROM users ORDER BY name ASC`;
  db.all(query, [], (err, users) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to load team members.' });
    res.json({ success: true, users });
  });
});

module.exports = router;