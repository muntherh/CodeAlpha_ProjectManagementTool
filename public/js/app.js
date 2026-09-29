const API_URL = '/api';
const STATUS_LABELS = { todo: 'To do', in_progress: 'In progress', review: 'In review', done: 'Done' };
const AVATAR_COLORS = ['#7c5c3b', '#3f6b5a', '#8a4b2f', '#4b5d7a', '#6b5a7c', '#7a6a2f'];
const ICONS = {
  calendar: '<svg class="icon" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  comment: '<svg class="icon" viewBox="0 0 24 24"><path d="M20 14a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/></svg>'
};

let currentProjectId = null;
let draggedTaskId = null;
let currentOpenTaskId = null;
let tasksById = {};
let projectsById = {};

function getToken() { return localStorage.getItem('kanban_token'); }
function getCurrentUser() { return JSON.parse(localStorage.getItem('kanban_user') || 'null'); }

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t]));
}

function goToSignIn() {
  localStorage.removeItem('kanban_token');
  localStorage.removeItem('kanban_user');
  window.location.href = 'auth.html';
}

// Every API call goes through here: adds the token and handles expired sessions
async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...(options.headers || {}) }
  });
  if (res.status === 401) {
    goToSignIn();
    throw new Error('Session expired');
  }
  return res.json();
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
}

function avatarHTML(name) {
  if (!name) return '<span class="avatar empty"></span>';
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return `<span class="avatar" style="background: ${color}" title="${escapeHTML(name)}">${escapeHTML(initials(name))}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function isOverdue(task) {
  return task.due_date && task.status !== 'done' && new Date(`${task.due_date}T23:59:59`) < new Date();
}

function updateAuthNav() {
  const nav = document.getElementById('auth-nav');
  const user = getCurrentUser();
  if (user && nav) {
    nav.innerHTML = `
      ${avatarHTML(user.name)}
      <span>${escapeHTML(user.name)}</span>
      <button onclick="logout()" class="btn btn-text">Sign out</button>
    `;
  }
}

function logout() {
  goToSignIn();
}

async function loadProjects(selectId = null) {
  try {
    const data = await api('/projects');
    const selector = document.getElementById('project-selector');

    if (data.success && data.projects.length > 0) {
      projectsById = {};
      data.projects.forEach(p => { projectsById[p.id] = p; });
      selector.innerHTML = data.projects.map(p => `
        <option value="${p.id}">${escapeHTML(p.title)}</option>
      `).join('');

      currentProjectId = selectId || data.projects[0].id;
      selector.value = currentProjectId;
      loadTasks(currentProjectId);
    } else {
      selector.innerHTML = '<option value="">No projects yet</option>';
      document.getElementById('project-heading').textContent = 'No projects yet';
      document.getElementById('project-desc').textContent = 'Create your first project to start adding tasks.';
    }
  } catch (err) {
    console.error(err);
  }
}

function switchProject(projId) {
  currentProjectId = projId;
  loadTasks(projId);
}

function taskCardHTML(t, index) {
  const due = t.due_date
    ? `<span class="${isOverdue(t) ? 'overdue' : ''}" title="Due date">${ICONS.calendar}${formatDate(t.due_date)}</span>`
    : '';
  const comments = t.comments_count > 0 ? `<span title="Comments">${ICONS.comment}${t.comments_count}</span>` : '';
  return `
    <div class="task-card ${t.status === 'done' ? 'is-done' : ''}" id="task-${t.id}" tabindex="0" style="animation-delay: ${index * 30}ms"
      draggable="true" ondragstart="handleDragStart(event, ${t.id})" ondragend="handleDragEnd(event)"
      onclick="openTaskDetails(${t.id})" onkeydown="if (event.key === 'Enter') openTaskDetails(${t.id})">
      <div class="card-top">
        <span class="task-priority priority-${escapeHTML(t.priority)}">${escapeHTML(t.priority)}</span>
        <span class="task-key">T-${t.id}</span>
      </div>
      <div class="task-title">${escapeHTML(t.title)}</div>
      <div class="task-footer">
        <div class="assignee-info">
          ${avatarHTML(t.assignee_name)}
          <span>${escapeHTML(t.assignee_name || 'Unassigned')}</span>
        </div>
        <div class="card-meta">${due}${comments}</div>
      </div>
    </div>
  `;
}

function renderProjectHead(tasks) {
  const project = projectsById[currentProjectId];
  if (!project) return;
  const done = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(isOverdue).length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  document.getElementById('project-heading').textContent = project.title;
  document.getElementById('project-desc').textContent = project.description || '';
  document.getElementById('project-stats').innerHTML = `
    <span><b>${tasks.length}</b> tasks</span>
    <span><b>${percent}%</b> done</span>
    ${overdue ? `<span class="overdue"><b class="overdue">${overdue}</b> overdue</span>` : ''}
  `;
  document.getElementById('project-progress').style.width = `${percent}%`;
}

async function loadTasks(projectId) {
  if (!projectId) return;

  try {
    const data = await api(`/tasks?projectId=${encodeURIComponent(projectId)}`);

    const columns = { todo: [], in_progress: [], review: [], done: [] };
    tasksById = {};
    if (data.success) {
      data.tasks.forEach(t => {
        tasksById[t.id] = t;
        if (columns[t.status]) columns[t.status].push(t);
      });
    }

    Object.keys(columns).forEach(status => {
      const tasks = columns[status];
      document.getElementById(`badge-${status}`).textContent = tasks.length;
      document.getElementById(`list-${status}`).innerHTML = tasks.length
        ? tasks.map(taskCardHTML).join('')
        : '<div class="empty-col">Nothing here yet</div>';
    });
    renderProjectHead(data.tasks || []);
  } catch (err) {
    console.error(err);
  }
}

async function moveTask(taskId, status) {
  try {
    const data = await api(`/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    if (!data.success) alert(data.message);
    await loadTasks(currentProjectId);
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
  const taskId = draggedTaskId;
  draggedTaskId = null;

  if (tasksById[taskId] && tasksById[taskId].status === targetStatus) return;
  await moveTask(taskId, targetStatus);
}

// Modal Details & Comments
function renderTaskMeta(task) {
  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) =>
    `<option value="${value}" ${task.status === value ? 'selected' : ''}>${label}</option>`
  ).join('');

  document.getElementById('modal-task-key').textContent = `T-${task.id}`;
  document.getElementById('modal-task-meta').innerHTML = `
    <dl class="meta-grid">
      <dt>Status</dt>
      <dd><select id="modal-status" class="form-control" style="width: auto; padding: 0.35rem 0.6rem;" onchange="moveTask(${task.id}, this.value)">${statusOptions}</select></dd>
      <dt>Priority</dt>
      <dd><span class="task-priority priority-${escapeHTML(task.priority)}">${escapeHTML(task.priority)}</span></dd>
      <dt>Assignee</dt>
      <dd>${avatarHTML(task.assignee_name)} ${escapeHTML(task.assignee_name || 'Unassigned')}</dd>
      <dt>Due</dt>
      <dd class="${isOverdue(task) ? 'overdue' : ''}">${task.due_date ? formatDate(task.due_date) + (isOverdue(task) ? ' · overdue' : '') : '<span class="muted">No due date</span>'}</dd>
    </dl>
    <div class="meta-actions">
      <button type="button" class="btn btn-danger" onclick="deleteTask(${task.id})">Delete task</button>
    </div>
  `;
}

async function loadComments(taskId) {
  const commentsList = document.getElementById('modal-comments-list');
  const data = await api(`/tasks/${taskId}/comments`);

  if (data.comments && data.comments.length > 0) {
    commentsList.innerHTML = data.comments.map(c => `
      <div class="comment-box">
        ${avatarHTML(c.user_name)}
        <div>
          <div class="comment-author">${escapeHTML(c.user_name)}</div>
          <div class="comment-text">${escapeHTML(c.content)}</div>
        </div>
      </div>
    `).join('');
  } else {
    commentsList.innerHTML = '<p class="muted" style="margin-bottom: 0.6rem;">No comments yet.</p>';
  }
}

async function openTaskDetails(taskId) {
  const task = tasksById[taskId];
  if (!task) return;

  currentOpenTaskId = taskId;
  document.getElementById('modal-task-title').textContent = task.title;
  document.getElementById('modal-task-desc').textContent = task.description || 'No description.';
  renderTaskMeta(task);

  try {
    await loadComments(taskId);
    openModal('task-detail-modal');
  } catch (err) {
    console.error(err);
  }
}

async function deleteTask(taskId) {
  if (!confirm('Delete this task and its comments?')) return;
  try {
    const data = await api(`/tasks/${taskId}`, { method: 'DELETE' });
    if (!data.success) return alert(data.message);
    closeModal('task-detail-modal');
    loadTasks(currentProjectId);
  } catch (err) {
    console.error(err);
  }
}

document.getElementById('add-comment-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('comment-input');
  const content = input.value.trim();
  if (!content || !currentOpenTaskId) return;

  try {
    const data = await api(`/tasks/${currentOpenTaskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) });
    if (!data.success) return alert(data.message);
    input.value = '';
    await loadComments(currentOpenTaskId);
    loadTasks(currentProjectId);
  } catch (err) {
    console.error(err);
  }
});

// Forms
document.getElementById('create-task-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentProjectId) return alert('Create a project first.');

  const payload = {
    project_id: currentProjectId,
    title: document.getElementById('task-title').value.trim(),
    description: document.getElementById('task-desc').value.trim(),
    priority: document.getElementById('task-priority').value,
    assignee_id: document.getElementById('task-assignee').value || null,
    due_date: document.getElementById('task-duedate').value || null
  };

  try {
    const data = await api('/tasks', { method: 'POST', body: JSON.stringify(payload) });
    if (!data.success) return alert(data.message);
    e.target.reset();
    closeModal('new-task-modal');
    loadTasks(currentProjectId);
  } catch (err) {
    console.error(err);
  }
});

document.getElementById('create-project-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('proj-title').value.trim();
  const description = document.getElementById('proj-desc').value.trim();

  try {
    const data = await api('/projects', { method: 'POST', body: JSON.stringify({ title, description }) });
    if (!data.success) return alert(data.message);
    e.target.reset();
    closeModal('new-project-modal');
    loadProjects(data.projectId);
  } catch (err) {
    console.error(err);
  }
});

async function loadTeamMembers() {
  const select = document.getElementById('task-assignee');
  if (!select) return;
  try {
    const data = await api('/users');
    if (data.success) {
      select.innerHTML = '<option value="">Unassigned</option>' + data.users.map(u => `
        <option value="${u.id}">${escapeHTML(u.name)}</option>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display = 'none'; });
});

document.addEventListener('DOMContentLoaded', () => {
  if (!getToken()) {
    window.location.href = 'auth.html';
    return;
  }
  updateAuthNav();
  loadProjects();
  loadTeamMembers();
});