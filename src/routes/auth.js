const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const verifyToken = require('../middleware/auth');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Register
router.post('/register', async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').toLowerCase().trim();
  const password = req.body.password || '';

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  if (name.length > 50) {
    return res.status(400).json({ success: false, message: 'Name must be 50 characters or less.' });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;

  db.run(query, [name, email, hashedPassword], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ success: false, message: 'Email is already in use.' });
      }
      return res.status(500).json({ success: false, message: 'Failed to create user.' });
    }

    const user = { id: this.lastID, name, email, avatar_url: null };
    res.status(201).json({ success: true, token: signToken(user), user });
  });
});

// Login
router.post('/login', (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const password = req.body.password || '';

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const query = `SELECT * FROM users WHERE email = ?`;
  db.get(query, [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    res.json({
      success: true,
      token: signToken(user),
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