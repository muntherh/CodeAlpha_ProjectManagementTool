const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../kanban.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('✓ SQLite database connected successfully.');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // 1. Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Projects Table
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);

    // 3. Tasks Table
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'done'
        priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
        assignee_id INTEGER,
        due_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (assignee_id) REFERENCES users(id)
      )
    `);

    // 4. Comments Table
    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    seedInitialData();
  });
}

function seedInitialData() {
  db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
    if (err) return;
    if (row.count === 0) {
      console.log('Seeding initial project management demo data...');
      const hash = bcrypt.hashSync('password123', 10);

      // Insert Demo Users
      const insertUser = db.prepare(`
        INSERT INTO users (name, email, password, avatar_url)
        VALUES (?, ?, ?, ?)
      `);

      insertUser.run('Al-Munther', 'lead@example.com', hash, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80');
      insertUser.run('Sarah Jenkins', 'sarah@example.com', hash, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80');
      insertUser.run('Alex Rivera', 'alex@example.com', hash, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80');

      insertUser.finalize(() => {
        // Insert Demo Projects
        const insertProj = db.prepare(`INSERT INTO projects (title, description, owner_id) VALUES (?, ?, ?)`);
        insertProj.run('🚀 AI Platform MVP Launch', 'Core product roadmap covering frontend UI, backend APIs, and real-time agent models.', 1);
        insertProj.run('📱 Mobile Client Redesign', 'Complete redesign of user onboarding flow, checkout experience, and dark mode theme.', 1);

        insertProj.finalize(() => {
          // Insert Demo Tasks
          const insertTask = db.prepare(`
            INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          insertTask.run(1, 'Architect Relational Database', 'Design SQLite tables for users, projects, tasks, and audit logs.', 'done', 'high', 1, '2026-09-10');
          insertTask.run(1, 'Implement JWT Authentication', 'Secure endpoints with Bearer token validation and bcrypt password hashing.', 'done', 'high', 2, '2026-09-12');
          insertTask.run(1, 'Build Kanban Drag-and-Drop UI', 'Create interactive column boards with smooth drag events and dynamic state updates.', 'in_progress', 'high', 1, '2026-09-15');
          insertTask.run(1, 'Task Detail Modal & Comments', 'Enable team members to open task cards, view metadata, and post live replies.', 'review', 'medium', 3, '2026-09-18');
          insertTask.run(1, 'Automate End-to-End Testing', 'Write integration tests for project board creation and status updates.', 'todo', 'low', 2, '2026-09-22');

          insertTask.finalize(() => {
            // Insert Demo Comments
            const insertComment = db.prepare(`INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)`);
            insertComment.run(3, 2, 'Drag and drop HTML5 API is working smoothly across desktop and mobile browsers!');
            insertComment.run(3, 1, 'Great job! Let us ensure database sync happens on drop event.');
            insertComment.finalize(() => {
              console.log('✓ Initial project management data seeded successfully.');
            });
          });
        });
      });
    }
  });
}

module.exports = db;