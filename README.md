# CodeAlpha Project Management Tool

A collaborative full-stack project management and interactive Kanban application built for the **CodeAlpha Full Stack Web Development Internship (Task 3)**.

## Features
- **Interactive Drag-and-Drop Kanban:** HTML5 drag-and-drop across 4 workflow states (`To Do`, `In Progress`, `In Review`, `Completed`), plus a "Move to" menu in each task for touch devices.
- **Multi-Project Workspaces:** Dynamic project switcher enabling team members to manage multiple group initiatives.
- **Rich Task Cards:** Priority badges (Low, Medium, High), due dates with overdue highlighting, assignee avatars, and comment counters.
- **Task Details & Comments:** Task modal with priority, assignee, due date, status change, delete, and a discussion thread.
- **Team Assignment:** Assign tasks to any registered team member.
- **Authentication & Permissions:** JWT sign-in for every API route; only a task's creator, assignee, or project owner can delete it.
- **Relational Database:** SQLite database managing `users`, `projects`, `tasks`, and `comments` with foreign keys and cascading deletes.

## Tech Stack
- **Frontend:** HTML5 (Drag & Drop API), Modern CSS3 (Linear/Trello layout), Vanilla JavaScript (ES6+)
- **Backend:** Node.js, Express.js
- **Database:** SQLite3
- **Security:** JSON Web Tokens (JWT), bcryptjs, input validation, HTML escaping, Dotenv

## Getting Started

1. **Clone the repository:**
```bash
git clone https://github.com/muntherh/CodeAlpha_ProjectManagementTool.git
cd CodeAlpha_ProjectManagementTool
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create your `.env` file** (copy `.env.example`) and set a long random `JWT_SECRET`:
```bash
cp .env.example .env
```

4. **Run the application:**
```bash
npm start
```

5. **Access the Kanban board:**
Open your browser and navigate to `http://localhost:5002`.
Demo accounts are created on first run (`lead@example.com`, `sarah@example.com`, `alex@example.com`, password `password123`).