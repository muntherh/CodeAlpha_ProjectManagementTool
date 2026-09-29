const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all team members for task assignment dropdown
router.get('/', (req, res) => {
  const query = `SELECT id, name, email, avatar_url FROM users ORDER BY name ASC`;
  db.all(query, [], (err, users) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to load team members.' });
    res.json({ success: true, users });
  });
});

module.exports = router;