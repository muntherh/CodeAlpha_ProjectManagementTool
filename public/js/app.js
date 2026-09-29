const API_URL = '/api';
let currentProjectId = null;
let draggedTaskId = null;
let currentOpenTaskId = null;

function getToken() { return localStorage.getItem('kanban_token'); }
function getCurrentUser() { return JSON.parse(localStorage.getItem('kanban_user') || 'null'); }

function updateAuthNav() {
  const nav = document.getElementById('auth-nav');
  const user = getCurrentUser();
  if (user && nav) {
    nav.innerHTML = `
      <span style="color: #cbd5e1; font-weight: 600; font-size: 0.9rem;">${user.name}</span>
      <button onclick="logout()" class="btn btn-light" style="padding: 0.35rem 0.7rem; font-size: 0.85rem;">Logout</button>
    `;
  }
}

function logout() {
  localStorage.removeItem('kanban_token');
  localStorage.removeItem('kanban_user');
  window.location.reload();
}

async function loadProjects() {
  try {
    const res = await fetch(`${API_URL}/projects`);
    const data = await res.json();
    const selector = document.getElementById('project-selector');

    if (data.success && data.projects.length > 0) {
      selector.innerHTML = data.projects.map(p => `
        <option value="${p.id}">${p.title}</option>
      `).join('');

      currentProjectId = data.projects[0].id;
      loadTasks(currentProjectId);
    } else {
      selector.innerHTML = '<option value="">No Projects Found</option>';
    }
  } catch (err) {
    console.error(err);
  }
}

function switchProject(projId) {
  currentProjectId = projId;
  loadTasks(projId);
}

async function loadTasks(projectId) {
  if (!projectId) return;

  try {
    const res = await fetch(`${API_URL}/tasks?projectId=${projectId}`);
    const data = await res.json();

    const columns = { todo: [], in_progress: [], review: [], done: [] };
    if (data.success) {
      data.tasks.forEach(t => {
        if (columns[t.status]) columns[t.status].push(t);
      });
    }

    Object.keys(columns).forEach(status => {
      const listEl = document.getElementById(`list-${status}`);
      const badgeEl = document.getElementById(`badge-${status}`);
      const tasks = columns[status];

      badgeEl.textContent = tasks.length;
      listEl.innerHTML = tasks.map(t => `
        <div class="task-card" id="task-${t.id}" draggable="true" ondragstart="handleDragStart(event, ${t.id})" ondragend="handleDragEnd(event)" onclick="openTaskDetails(${t.id}, '${escapeHTML(t.title)}', '${escapeHTML(t.description || '')}')">
          <span class="task-priority priority-${t.priority}">${t.priority}</span>
          <div class="task-title">${escapeHTML(t.title)}</div>
          <div class="task-footer">
            <div class="assignee-info">
              ${t.assignee_avatar ? `<img src="${t.assignee_avatar}" class="assignee-avatar">` : ''}
              <span>${t.assignee_name || 'Unassigned'}</span>
            </div>
            <span>💬 ${t.comments_count}</span>
          </div>
        </div>
      `).join('');
    });
  } catch (err) {
    console.error(err);
  }
}

// Drag and Drop
function handleDragStart(e, taskId) {
  draggedTaskId = taskId;
  e.target.classList.add('dragging');
  e.dataTransfer.setData('text/plain', taskId);
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.task-list').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(e) {
  e.preventDefault();
  const list = e.currentTarget.querySelector('.task-list');
  if (list) list.classList.add('drag-over');
}

function handleDragLeave(e) {
  const list = e.currentTarget.querySelector('.task-list');
  if (list) list.classList.remove('drag-over');
}

async function handleDrop(e, targetStatus) {
  e.preventDefault();
  const list = e.currentTarget.querySelector('.task-list');
  if (list) list.classList.remove('drag-over');

  if (!draggedTaskId) return;

  const token = getToken();
  if (!token) {
    alert('Please sign in to update tasks.');
    window.location.href = 'auth.html';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/tasks/${draggedTaskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: targetStatus })
    });
    const data = await res.json();
    if (data.success) {
      loadTasks(currentProjectId);
    }
  } catch (err) {
    console.error(err);
  }
}

// Modal Details & Comments
async function openTaskDetails(taskId, title, desc) {
  currentOpenTaskId = taskId;
  document.getElementById('modal-task-title').textContent = title;
  document.getElementById('modal-task-desc').textContent = desc || 'No description provided.';
  const modal = document.getElementById('task-detail-modal');

  try {
    const res = await fetch(`${API_URL}/tasks/${taskId}/comments`);
    const data = await res.json();
    const commentsList = document.getElementById('modal-comments-list');

    if (data.comments && data.comments.length > 0) {
      commentsList.innerHTML = data.comments.map(c => `
        <div class="comment-box">
          <div style="font-weight: 700; color: var(--primary); font-size: 0.85rem; margin-bottom: 0.2rem;">${c.user_name}</div>
          <div>${escapeHTML(c.content)}</div>
        </div>
      `).join('');
    } else {
      commentsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No comments yet on this card.</p>';
    }

    modal.style.display = 'flex';
  } catch (err) {
    console.error(err);
  }
}

document.getElementById('add-comment-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = getToken();
  if (!token) {
    alert('Please login to comment.');
    window.location.href = 'auth.html';
    return;
  }

  const input = document.getElementById('comment-input');
  const content = input.value.trim();
  if (!content || !currentOpenTaskId) return;

  try {
    const res = await fetch(`${API_URL}/tasks/${currentOpenTaskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    if (data.success) {
      input.value = '';
      openTaskDetails(currentOpenTaskId, document.getElementById('modal-task-title').textContent, document.getElementById('modal-task-desc').textContent);
      loadTasks(currentProjectId);
    }
  } catch (err) {
    console.error(err);
  }
});

// Forms
document.getElementById('create-task-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = getToken();
  if (!token) {
    alert('Please sign in to add a task.');
    window.location.href = 'auth.html';
    return;
  }

  const payload = {
    project_id: currentProjectId,
    title: document.getElementById('task-title').value.trim(),
    description: document.getElementById('task-desc').value.trim(),
    priority: document.getElementById('task-priority').value,
    assignee_id: document.getElementById('task-assignee').value || null,
    due_date: document.getElementById('task-duedate').value || null
  };

  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.success) {
    closeModal('new-task-modal');
    loadTasks(currentProjectId);
  }
});

document.getElementById('create-project-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = getToken();
  if (!token) {
    alert('Please sign in to create a project.');
    window.location.href = 'auth.html';
    return;
  }

  const title = document.getElementById('proj-title').value.trim();
  const description = document.getElementById('proj-desc').value.trim();

  const res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ title, description })
  });
  const data = await res.json();
  if (data.success) {
    closeModal('new-project-modal');
    loadProjects();
  }
});

async function loadTeamMembers() {
  const select = document.getElementById('task-assignee');
  if (!select) return;
  try {
    const res = await fetch(`${API_URL}/users`);
    const data = await res.json();
    if (data.success) {
      select.innerHTML = '<option value="">Unassigned</option>' + data.users.map(u => `
        <option value="${u.id}">${u.name}</option>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
}

document.addEventListener('DOMContentLoaded', () => {
  updateAuthNav();
  loadProjects();
  loadTeamMembers();
});