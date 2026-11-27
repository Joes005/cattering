const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const raw = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
    return raw.endsWith('/api') ? raw : `${raw}/api`;
  }
  if (
    typeof window !== 'undefined' &&
    (window.Capacitor?.isNativePlatform?.() ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80')))
  ) {
    return 'http://localhost:8000/api';
  }
  return '/api';
};

const BASE_URL = getBaseUrl();

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error('Unable to connect to the backend server. Please verify the service is running.');
  }

  if (!res.ok) {
    let detail = res.statusText || 'Request failed';
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // not JSON
      try {
        const text = await res.text();
        if (text && text.length < 200) detail = text;
      } catch {
        // ignore
      }
    }
    if (res.status === 500 && (detail === 'Internal Server Error' || !detail)) {
      detail = 'Server error encountered. The backend service may be restarting or unavailable.';
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  if (res.status === 204) return null;
  return res.json();
}

async function upload(path, formData, auth = false) {
  const headers = {};
  if (auth) {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // no JSON body
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return res.json();
}

export const api = {
  get: (path, auth = false) => request(path, { method: 'GET', auth }),
  post: (path, body, auth = false) => request(path, { method: 'POST', body, auth }),
  put: (path, body, auth = false) => request(path, { method: 'PUT', body, auth }),
  patch: (path, body, auth = false) => request(path, { method: 'PATCH', body, auth }),
  del: (path, auth = false) => request(path, { method: 'DELETE', auth }),
  upload,
};
