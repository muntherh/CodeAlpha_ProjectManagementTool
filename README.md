# CodeAlpha_ProjectManagementTool 📋

A collaborative full-stack project management and interactive Kanban application built for the **CodeAlpha Full Stack Web Development Internship (Task 3)**.

## 🚀 Features
- **Interactive Drag-and-Drop Kanban:** Smooth HTML5 drag-and-drop workflows across 4 workflow states (`To Do`, `In Progress`, `In Review`, `Completed`).
- **Multi-Project Workspaces:** Dynamic project switcher enabling team members to manage multiple group initiatives.
- **Rich Task Cards:** Priority badges (Low, Medium, High), due dates, assignee avatars, and live comment counters.
- **Task Modals & Communication:** In-depth task modal view with a real-time discussion thread for team collaboration.
- **Team Assignment:** Role-based task allocation to team members with persistent profile details.
- **Relational Database:** SQLite database managing `users`, `projects`, `tasks`, and `comments` with relational integrity.

## 🛠️ Tech Stack
- **Frontend:** HTML5 (Drag & Drop API), Modern CSS3 (Linear/Trello layout), Vanilla JavaScript (ES6+)
- **Backend:** Node.js, Express.js
- **Database:** SQLite3
- **Security:** JSON Web Tokens (JWT), bcryptjs, CORS, Dotenv

## 💻 Getting Started Locally

1. **Clone the repository:**
```bash
git clone [https://github.com/muntherh/CodeAlpha_ProjectManagementTool.git](https://github.com/muntherh/CodeAlpha_ProjectManagementTool.git)
cd CodeAlpha_ProjectManagementTool
```

2. **Install dependencies:**
```bash
npm install
```

3. **Run the application:**
```bash
node server.js
```

4. **Access the Kanban board:**
Open your browser and navigate to `http://localhost:5002`.