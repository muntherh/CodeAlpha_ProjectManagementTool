require('dotenv').config();
const express = require('express');
const path = require('path');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Create a .env file (see .env.example) before starting the server.');
  process.exit(1);
}

// Initialize database
require('./src/db');

// Route handlers
const authRoutes = require('./src/routes/auth');
const projectRoutes = require('./src/routes/projects');
const taskRoutes = require('./src/routes/tasks');
const userRoutes = require('./src/routes/users');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'active', app: 'CodeAlpha Kanban & Project Management API' });
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`CodeAlpha Kanban running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server listen error:', err.message);
});