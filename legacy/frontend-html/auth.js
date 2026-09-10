const API_URL = 'http://localhost:5000/api';

const signupForm = document.getElementById('signup-form');
const loginForm  = document.getElementById('login-form');
const errorMsg   = document.getElementById('error-msg');

// ── SIGNUP ───────────────────────────────────────────────────────────────────
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name         = document.getElementById('name').value.trim();
    const email        = document.getElementById('email').value.trim();
    const password     = document.getElementById('password').value;
    const role         = document.getElementById('role').value;
    const company_name = document.getElementById('company_name')?.value.trim() || '';
    const location     = document.getElementById('location')?.value.trim()     || '';

    const submitBtn = signupForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating account…'; }
    hideError();

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, company_name, location })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user',  JSON.stringify(data.user));
        window.location.href = 'catering-platform.html';
      } else {
        showError(data.errors ? data.errors[0].msg : data.error);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Account'; }
      }
    } catch (err) {
      showError('Cannot connect to server. Make sure backend is running on port 5000.');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Account'; }
    }
  });

  // Toggle company name field for employers
  const roleSelect = document.getElementById('role');
  const companyRow = document.getElementById('company-row');
  if (roleSelect && companyRow) {
    roleSelect.addEventListener('change', () => {
      companyRow.style.display = roleSelect.value === 'employer' ? 'block' : 'none';
    });
  }
}

// ── LOGIN ────────────────────────────────────────────────────────────────────
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in…'; }
    hideError();

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user',  JSON.stringify(data.user));
        window.location.href = 'catering-platform.html';
      } else {
        showError(data.errors ? data.errors[0].msg : data.error);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }
      }
    } catch (err) {
      showError('Cannot connect to server. Make sure backend is running on port 5000.');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In'; }
    }
  });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function showError(msg) {
  if (errorMsg) {
    errorMsg.textContent = msg || 'An error occurred.';
    errorMsg.style.display = 'block';
  }
}
function hideError() {
  if (errorMsg) errorMsg.style.display = 'none';
}
