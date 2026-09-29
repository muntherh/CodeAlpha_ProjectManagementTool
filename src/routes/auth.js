const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const verifyToken = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_kanban_codealpha_2026';

// Register
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;

  db.run(query, [name.trim(), email.toLowerCase().trim(), hashedPassword], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ success: false, message: 'Email is already in use.' });
      }
      return res.status(500).json({ success: false, message: 'Failed to create user.' });
    }

    const userId = this.lastID;
    const token = jwt.sign({ id: userId, email: email.toLowerCase().trim(), name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      token,
      user: { id: userId, name, email: email.toLowerCase().trim() }
    });
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const query = `SELECT * FROM users WHERE email = ?`;
  db.get(query, [email.toLowerCase().trim()], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url }
    });
  });
});

// Current User Info
router.get('/me', verifyToken, (req, res) => {
  const query = `SELECT id, name, email, avatar_url FROM users WHERE id = ?`;
  db.get(query, [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  });
});

module.exports = router;