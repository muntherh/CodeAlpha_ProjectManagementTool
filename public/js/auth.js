let isSignUp = false;

function showAlert(message, type) {
  const alertEl = document.getElementById('auth-alert');
  alertEl.textContent = message;
  alertEl.className = `auth-alert ${type}`;
}

function toggleAuthMode() {
  isSignUp = !isSignUp;
  document.getElementById('auth-alert').className = 'auth-alert';
  document.getElementById('name-group').style.display = isSignUp ? 'block' : 'none';
  document.getElementById('auth-name').required = isSignUp;
  document.getElementById('auth-title').textContent = isSignUp ? 'Create your account' : 'Sign in';
  document.getElementById('auth-sub').textContent = isSignUp
    ? 'It takes a minute. You can join any project after.'
    : 'Welcome back. Pick up where your team left off.';
  document.getElementById('auth-submit-btn').textContent = isSignUp ? 'Create account' : 'Sign in';
  document.getElementById('auth-switch-text').textContent = isSignUp ? 'Already have an account?' : 'New here?';
  document.getElementById('auth-switch-link').textContent = isSignUp ? 'Sign in' : 'Create an account';
}

document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();

  const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
  const payload = isSignUp ? { name, email, password } : { email, password };
  const submitBtn = document.getElementById('auth-submit-btn');
  submitBtn.disabled = true;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!data.success) {
      showAlert(data.message, 'error');
      submitBtn.disabled = false;
      return;
    }

    localStorage.setItem('kanban_token', data.token);
    localStorage.setItem('kanban_user', JSON.stringify(data.user));
    showAlert('Signed in. Opening your board…', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 500);
  } catch (err) {
    showAlert('Could not reach the server. Is it running?', 'error');
    submitBtn.disabled = false;
  }
});