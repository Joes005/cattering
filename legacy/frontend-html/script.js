const API_URL = 'http://localhost:5000/api';

// ── State ─────────────────────────────────────────────────────────────────────
let currentJobId    = null;
let currentTalentId = null;
let searchMode      = 'jobs';

// ── On Page Load ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateNav();
  fetchJobs();
  fetchTalent();
  fetchCategories();
});

// ── Nav: show user name or login/signup buttons ───────────────────────────────
function updateNav() {
  const nav  = document.getElementById('nav-actions');
  if (!nav) return;
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (user) {
    const dashLabel = user.role === 'employer' ? '📋 My Jobs' : '📄 My Applications';
    nav.innerHTML = `
      <button class="btn-ghost" onclick="openDashboard()">${dashLabel}</button>
      <div class="user-badge">👤 ${user.name || user.email.split('@')[0]}</div>
      <button class="btn-ghost" onclick="signOut()">Sign Out</button>`;
  } else {
    nav.innerHTML = `
      <button class="btn-ghost"   onclick="location.href='login.html'">Sign In</button>
      <button class="btn-primary" onclick="location.href='signup.html'">Get Started</button>`;
  }
}

function signOut() {
  localStorage.clear();
  showToast('Signed out successfully');
  setTimeout(() => location.reload(), 800);
}

// ── Tab switcher ──────────────────────────────────────────────────────────────
function setTab(btn, mode) {
  document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  searchMode = mode || 'jobs';
  const searchBtn = document.querySelector('.btn-search');
  if (searchBtn) searchBtn.textContent = mode === 'talent' ? 'Search Talent' : 'Search Jobs';
}

function setHowTab(btn, which) {
  document.querySelectorAll('.how-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('steps-seeker').style.display  = which === 'seeker'   ? 'grid' : 'none';
  document.getElementById('steps-employer').style.display = which === 'employer' ? 'grid' : 'none';
}

// ── Fetch Featured Jobs ───────────────────────────────────────────────────────
async function fetchJobs() {
  const grid = document.getElementById('jobs-grid');
  if (!grid) return;
  grid.innerHTML = `<div class="loading">Loading featured jobs…</div>`;
  try {
    const res  = await fetch(`${API_URL}/jobs/featured`);
    const jobs = await res.json();

    if (!Array.isArray(jobs) || !jobs.length) {
      grid.innerHTML = `<div class="empty-state"><span>💼</span>No featured jobs yet.</div>`;
      return;
    }
    grid.innerHTML = jobs.map(job => jobCard(job)).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><span>⚠️</span>Could not load jobs. Is the backend running?</div>`;
    console.error('fetchJobs error:', err);
  }
}

// ── Load All Jobs ─────────────────────────────────────────────────────────────
async function loadAllJobs() {
  const grid = document.getElementById('jobs-grid');
  if (!grid) return;
  grid.innerHTML = `<div class="loading">Loading all jobs…</div>`;
  try {
    const res  = await fetch(`${API_URL}/jobs?limit=50`);
    const data = await res.json();
    if (!data.jobs || !data.jobs.length) {
      grid.innerHTML = `<div class="empty-state"><span>💼</span>No jobs found.</div>`;
      return;
    }
    grid.innerHTML = data.jobs.map(job => jobCard(job)).join('');
  } catch (err) {
    console.error('loadAllJobs error:', err);
    grid.innerHTML = `<div class="empty-state"><span>⚠️</span>Could not load jobs.</div>`;
  }
}

// ── Job Card HTML ─────────────────────────────────────────────────────────────
function jobCard(job) {
  const tags    = Array.isArray(job.tags) ? job.tags : [];
  const minVal  = parseFloat(job.salary_min || 0);
  const maxVal  = parseFloat(job.salary_max || 0);
  let salaryStr = '';
  if (minVal > 0 && maxVal > 0) {
    if (job.salary_type === 'hourly') {
      salaryStr = `$${minVal}–$${maxVal}<span>/hr</span>`;
    } else {
      salaryStr = `$${Number(minVal).toLocaleString()}–$${Number(maxVal).toLocaleString()}<span>/yr</span>`;
    }
  } else if (minVal > 0) {
    salaryStr = job.salary_type === 'hourly'
      ? `$${minVal}<span>/hr</span>`
      : `$${Number(minVal).toLocaleString()}<span>/yr</span>`;
  } else {
    salaryStr = `<span>Salary TBD</span>`;
  }
  const posted = timeAgo(job.created_at);

  return `
    <div class="job-card">
      <div class="job-card-top">
        <div class="company-avatar">${getAvatarForJob(job.company_name)}</div>
        <span class="job-badge ${getBadgeClass(job.badge)}">${capitalize(job.badge || 'new')}</span>
      </div>
      <h3>${escHtml(job.title)}</h3>
      <div class="job-company">${escHtml(job.company_name)} · ${escHtml(job.location)}</div>
      <div class="job-tags">
        ${tags.map(tag => `<span class="job-tag">${escHtml(tag)}</span>`).join('')}
      </div>
      <div class="job-card-footer">
        <div class="job-salary">${salaryStr}</div>
        <div class="job-time">${posted}</div>
      </div>
      <button class="btn-apply" onclick="openApplyModal('${job.id}','${escAttr(job.title)}')">
        Apply Now
      </button>
    </div>`;
}

// ── Fetch Top Talent ──────────────────────────────────────────────────────────
async function fetchTalent() {
  const grid = document.getElementById('talent-grid');
  if (!grid) return;
  grid.innerHTML = `<div class="loading">Loading talent…</div>`;
  try {
    const res     = await fetch(`${API_URL}/talent/top`);
    const talents = await res.json();

    if (!Array.isArray(talents) || !talents.length) {
      grid.innerHTML = `<div class="empty-state"><span>👨‍🍳</span>No talent profiles yet.</div>`;
      return;
    }
    grid.innerHTML = talents.map(t => talentCard(t)).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><span>⚠️</span>Could not load talent.</div>`;
    console.error('fetchTalent error:', err);
  }
}

// ── Talent Card HTML ──────────────────────────────────────────────────────────
const AVATARS = ['👨‍🍳','👩‍🍳','🧑‍🍳','👨‍🔧','👩‍💼'];
function talentCard(talent) {
  const skills  = Array.isArray(talent.skills) ? talent.skills : [];
  const rating  = parseFloat(talent.avg_rating || 0);
  const stars   = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  const avatar  = AVATARS[Math.abs(hashStr(talent.name || '')) % AVATARS.length];

  return `
    <div class="talent-card">
      <div class="talent-avatar">${avatar}</div>
      <h4>${escHtml(talent.name)}</h4>
      <div class="talent-role">${escHtml(talent.title || 'Catering Professional')}</div>
      <div class="talent-loc">📍 ${escHtml(talent.location || 'Location not set')}</div>
      <div class="stars">${stars}</div>
      <div class="talent-rating">${rating.toFixed(1)} (${talent.review_count || 0} reviews)</div>
      <div class="talent-skills">
        ${skills.slice(0,3).map(s => `<span class="skill-pill">${escHtml(s)}</span>`).join('')}
      </div>
      <button class="btn-connect" onclick="openConnectModal('${talent.id}','${escAttr(talent.name)}')">
        Connect
      </button>
    </div>`;
}

// ── Fetch Categories ──────────────────────────────────────────────────────────
async function fetchCategories() {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;
  try {
    const res        = await fetch(`${API_URL}/categories`);
    const categories = await res.json();
    if (!Array.isArray(categories) || !categories.length) return;

    grid.innerHTML = categories.map(cat => `
      <div class="cat-card" onclick="searchByCategory('${escAttr(cat.name)}')">
        <div class="cat-icon">${cat.icon || '🍽'}</div>
        <div class="cat-label">${escHtml(cat.name)}</div>
        <div class="cat-count">${cat.live_jobs || cat.job_count || 0} jobs</div>
      </div>`
    ).join('');
  } catch (err) {
    console.error('fetchCategories error:', err);
  }
}

// ── Search ────────────────────────────────────────────────────────────────────
async function handleSearch() {
  const keyword  = document.getElementById('search-keyword')?.value.trim()  || '';
  const location = document.getElementById('search-location')?.value.trim() || '';
  const type     = document.getElementById('search-type')?.value            || '';

  if (!keyword && !location && !type) {
    showToast('Please enter a keyword, location, or type to search');
    return;
  }

  const resultsSection = document.getElementById('search-results-section');
  const resultsGrid    = document.getElementById('search-results-grid');
  const resultsCount   = document.getElementById('search-results-count');

  resultsSection.style.display = 'block';
  resultsGrid.innerHTML = `<div class="loading">Searching…</div>`;
  resultsSection.scrollIntoView({ behavior: 'smooth' });

  try {
    const res  = await fetch(
      `${API_URL}/search?q=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&type=${encodeURIComponent(type)}&mode=${searchMode}`
    );
    const data = await res.json();

    resultsCount.textContent = `${data.total} result${data.total !== 1 ? 's' : ''} found`;

    if (!data.results || !data.results.length) {
      resultsGrid.innerHTML = `<div class="empty-state"><span>🔍</span>No results found. Try different keywords.</div>`;
      return;
    }

    if (searchMode === 'talent') {
      resultsGrid.innerHTML = data.results.map(t => talentCard(t)).join('');
    } else {
      resultsGrid.innerHTML = data.results.map(j => jobCard(j)).join('');
    }
  } catch (err) {
    resultsGrid.innerHTML = `<div class="empty-state"><span>⚠️</span>Search failed. Is backend running?</div>`;
    console.error('Search error:', err);
  }
}

function clearSearch() {
  document.getElementById('search-results-section').style.display = 'none';
  document.getElementById('search-keyword').value  = '';
  document.getElementById('search-location').value = '';
  document.getElementById('search-type').value     = '';
}

async function searchByCategory(categoryName) {
  document.getElementById('search-keyword').value = categoryName;
  searchMode = 'jobs';
  // sync tab UI
  document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.search-tab')?.classList.add('active');
  await handleSearch();
}

// ── Apply Modal ───────────────────────────────────────────────────────────────
function openApplyModal(jobId, jobTitle) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) {
    showToast('Please sign in to apply for jobs');
    setTimeout(() => location.href = 'login.html', 1200);
    return;
  }
  if (user.role === 'employer') {
    showToast('Employers cannot apply for jobs');
    return;
  }
  currentJobId = jobId;
  document.getElementById('apply-job-title').textContent = jobTitle;
  document.getElementById('cover-note').value = '';
  document.getElementById('apply-error').textContent = '';
  const btn = document.getElementById('apply-submit-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Submit Application'; }
  document.getElementById('apply-modal').classList.add('open');
}

async function submitApplication() {
  const token     = localStorage.getItem('token');
  const coverNote = document.getElementById('cover-note').value.trim();
  const btn       = document.getElementById('apply-submit-btn');
  const errEl     = document.getElementById('apply-error');

  if (!token) { location.href = 'login.html'; return; }

  btn.disabled = true;
  btn.textContent = 'Submitting…';
  errEl.textContent = '';

  try {
    const res  = await fetch(`${API_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ job_id: currentJobId, cover_note: coverNote })
    });
    const data = await res.json();

    if (res.ok) {
      closeModal('apply-modal');
      showToast('✅ Application submitted successfully!');
    } else {
      errEl.textContent = data.error || 'Application failed. Please try again.';
      btn.disabled = false;
      btn.textContent = 'Submit Application';
    }
  } catch (err) {
    errEl.textContent = 'Connection error. Is backend running?';
    btn.disabled = false;
    btn.textContent = 'Submit Application';
    console.error('submitApplication error:', err);
  }
}

// ── Connect Modal ─────────────────────────────────────────────────────────────
function openConnectModal(talentId, talentName) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) {
    showToast('Please sign in to connect with talent');
    setTimeout(() => location.href = 'login.html', 1200);
    return;
  }
  currentTalentId = talentId;
  document.getElementById('connect-talent-name').textContent = talentName;
  document.getElementById('connect-message').value = '';
  document.getElementById('connect-error').textContent = '';
  const btn = document.getElementById('connect-submit-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Send Message'; }
  document.getElementById('connect-modal').classList.add('open');
}

async function submitConnect() {
  const token   = localStorage.getItem('token');
  const message = document.getElementById('connect-message').value.trim();
  const btn     = document.getElementById('connect-submit-btn');
  const errEl   = document.getElementById('connect-error');

  if (!message) { errEl.textContent = 'Please write a message'; return; }
  if (!token)   { location.href = 'login.html'; return; }

  btn.disabled = true;
  btn.textContent = 'Sending…';
  errEl.textContent = '';

  try {
    const res  = await fetch(`${API_URL}/talent/${currentTalentId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content: message })
    });
    const data = await res.json();

    if (res.ok) {
      closeModal('connect-modal');
      showToast('✅ Message sent successfully!');
    } else {
      errEl.textContent = data.error || 'Could not send message.';
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }
  } catch (err) {
    errEl.textContent = 'Connection error. Is backend running?';
    btn.disabled = false;
    btn.textContent = 'Send Message';
    console.error('submitConnect error:', err);
  }
}

// ── Post a Job Modal (employer only) ─────────────────────────────────────────
function openPostJob() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) {
    showToast('Please sign in to post a job');
    setTimeout(() => location.href = 'login.html', 1200);
    return;
  }
  if (user.role !== 'employer') {
    showToast('Only employers can post jobs. Please sign up as an employer.');
    return;
  }
  // Reset form
  document.getElementById('post-job-form').reset();
  document.getElementById('post-job-error').textContent = '';
  const btn = document.getElementById('post-job-submit-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Post Job'; }
  document.getElementById('post-job-modal').classList.add('open');
}

async function submitPostJob() {
  const token  = localStorage.getItem('token');
  const btn    = document.getElementById('post-job-submit-btn');
  const errEl  = document.getElementById('post-job-error');

  if (!token) { location.href = 'login.html'; return; }

  const title       = document.getElementById('pj-title').value.trim();
  const location    = document.getElementById('pj-location').value.trim();
  const description = document.getElementById('pj-description').value.trim();
  const job_type    = document.getElementById('pj-type').value;
  const salary_min  = parseFloat(document.getElementById('pj-salary-min').value) || null;
  const salary_max  = parseFloat(document.getElementById('pj-salary-max').value) || null;
  const salary_type = document.getElementById('pj-salary-type').value;
  const tagsRaw     = document.getElementById('pj-tags').value.trim();
  const tags        = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const badge       = document.getElementById('pj-badge').value || 'new';

  if (!title || !location || !description || !job_type) {
    errEl.textContent = 'Please fill in title, location, description and job type.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Posting…';
  errEl.textContent = '';

  try {
    const res  = await fetch(`${API_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, location, description, job_type,
        salary_min, salary_max, salary_type, tags, badge })
    });
    const data = await res.json();

    if (res.ok) {
      closeModal('post-job-modal');
      showToast('✅ Job posted successfully!');
      fetchJobs(); // refresh featured jobs
    } else {
      errEl.textContent = data.error || 'Could not post job. Try again.';
      btn.disabled = false;
      btn.textContent = 'Post Job';
    }
  } catch (err) {
    errEl.textContent = 'Connection error. Is backend running?';
    btn.disabled = false;
    btn.textContent = 'Post Job';
    console.error('submitPostJob error:', err);
  }
}

// ── Dashboard Modal ───────────────────────────────────────────────────────────
async function openDashboard() {
  const user  = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');
  if (!user || !token) { location.href = 'login.html'; return; }

  const modal = document.getElementById('dashboard-modal');
  const body  = document.getElementById('dashboard-body');

  modal.classList.add('open');
  body.innerHTML = `<div class="loading">Loading your dashboard…</div>`;

  try {
    if (user.role === 'employer') {
      // Fetch employer's posted jobs
      const res  = await fetch(`${API_URL}/jobs/mine/posted`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const jobs = await res.json();

      if (!res.ok) throw new Error(jobs.error || 'Failed to load jobs');

      body.innerHTML = `
        <h3 style="margin-bottom:16px;">📋 Your Posted Jobs (${jobs.length})</h3>
        ${!jobs.length
          ? `<div class="empty-state"><span>💼</span>No jobs posted yet.<br><button class="btn-submit" style="margin-top:16px" onclick="closeModal('dashboard-modal');openPostJob()">Post Your First Job</button></div>`
          : jobs.map(j => `
            <div class="dash-item">
              <div class="dash-item-main">
                <strong>${escHtml(j.title)}</strong>
                <span class="dash-meta">${escHtml(j.location)} · ${capitalize(j.job_type || '')} · <span class="job-badge ${getBadgeClass(j.badge)}" style="font-size:0.7rem;padding:2px 8px">${capitalize(j.badge || 'new')}</span></span>
              </div>
              <div class="dash-item-stat">
                <span>👥 ${j.application_count || 0} applicants</span>
                <span class="dash-status ${j.status === 'open' ? 'status-open' : 'status-closed'}">${j.status}</span>
              </div>
            </div>`).join('')
        }
        <div style="margin-top:20px;text-align:center">
          <button class="btn-submit" onclick="closeModal('dashboard-modal');openPostJob()">+ Post New Job</button>
        </div>`;
    } else {
      // Fetch seeker's applications
      const res  = await fetch(`${API_URL}/applications/mine`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const apps = await res.json();

      if (!res.ok) throw new Error(apps.error || 'Failed to load applications');

      const statusIcon = { pending:'🕐', reviewed:'👀', accepted:'✅', rejected:'❌', withdrawn:'↩️' };

      body.innerHTML = `
        <h3 style="margin-bottom:16px;">📄 Your Applications (${apps.length})</h3>
        ${!apps.length
          ? `<div class="empty-state"><span>📋</span>No applications yet.<br><a href="#jobs-section" onclick="closeModal('dashboard-modal')" style="color:#2d6a4f;font-weight:600">Browse Jobs →</a></div>`
          : apps.map(a => `
            <div class="dash-item">
              <div class="dash-item-main">
                <strong>${escHtml(a.title)}</strong>
                <span class="dash-meta">${escHtml(a.company_name)} · ${escHtml(a.location)}</span>
              </div>
              <div class="dash-item-stat">
                <span>${statusIcon[a.status] || '🕐'} ${capitalize(a.status || 'pending')}</span>
                <span class="dash-date">${timeAgo(a.applied_at)}</span>
              </div>
            </div>`).join('')
        }`;
    }
  } catch (err) {
    body.innerHTML = `<div class="empty-state"><span>⚠️</span>${err.message || 'Could not load dashboard.'}</div>`;
    console.error('openDashboard error:', err);
  }
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ── Toast notification ────────────────────────────────────────────────────────
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAvatarForJob(company = '') {
  if (company.includes('Hotel'))      return '🏨';
  if (company.includes('Events'))     return '🎪';
  if (company.includes('Green'))      return '🌿';
  if (company.includes('Sky'))        return '✈️';
  if (company.includes('University')) return '🎓';
  if (company.includes('Studio'))     return '🎉';
  return '🏢';
}

function getBadgeClass(badge = '') {
  if (badge === 'featured') return 'badge-featured';
  if (badge === 'urgent')   return 'badge-urgent';
  return 'badge-new';
}

function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Recently';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 3600)   return 'Just now';
  if (diff < 86400)  return 'Today';
  if (diff < 172800) return '1 day ago';
  return `${Math.floor(diff / 86400)} days ago`;
}

function escHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function escAttr(str = '') {
  return String(str).replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return h;
}
