require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

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
app.use(cors());
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
  console.log(`=================================================`);
  console.log(`🚀 CodeAlpha Kanban Tool running on port ${PORT}!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`=================================================`);
});

server.on('error', (err) => {
  console.error('❌ Server Listen Error:', err.message);
});