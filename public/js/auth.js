let isSignUp = false;

function toggleAuthMode() {
  isSignUp = !isSignUp;
  const nameGroup = document.getElementById('name-group');
  const submitBtn = document.getElementById('auth-submit-btn');
  const switchText = document.getElementById('auth-switch-text');
  const switchLink = document.getElementById('auth-switch-link');
  const alertEl = document.getElementById('auth-alert');

  alertEl.style.display = 'none';

  if (isSignUp) {
    nameGroup.style.display = 'block';
    submitBtn.textContent = 'Create Account';
    switchText.textContent = 'Already have an account?';
    switchLink.textContent = 'Sign In';
  } else {
    nameGroup.style.display = 'none';
    submitBtn.textContent = 'Sign In';
    switchText.textContent = "Don't have an account?";
    switchLink.textContent = 'Create one';
  }
}

document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const alertEl = document.getElementById('auth-alert');
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();

  const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
  const payload = isSignUp ? { name, email, password } : { email, password };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!data.success) {
      alertEl.textContent = data.message;
      alertEl.style.display = 'block';
      alertEl.style.background = '#fee2e2';
      alertEl.style.color = '#dc2626';
      return;
    }

    localStorage.setItem('kanban_token', data.token);
    localStorage.setItem('kanban_user', JSON.stringify(data.user));

    alertEl.textContent = 'Success! Redirecting to board...';
    alertEl.style.display = 'block';
    alertEl.style.background = '#dcfce7';
    alertEl.style.color = '#16a34a';

    setTimeout(() => { window.location.href = 'index.html'; }, 700);
  } catch (err) {
    alertEl.textContent = 'Network error occurred.';
    alertEl.style.display = 'block';
  }
});