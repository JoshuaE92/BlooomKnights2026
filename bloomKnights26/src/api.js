// Tiny API client for the GreenCart backend.
// In dev, paths are same-origin ('/api/...') and Vite proxies them to the
// backend (see vite.config.js) — no CORS. In prod, set VITE_API_BASE to the
// backend URL.
const BASE = import.meta.env.VITE_API_BASE || '';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (username, email, password) =>
    request('/api/auth/register', { method: 'POST', body: { username, email, password } }),
  login: (identifier, password) =>
    request('/api/auth/login', { method: 'POST', body: { identifier, password } }),
  suggest: (prompt, stores) =>
    request('/api/ai/suggest', { method: 'POST', auth: true, body: { prompt, stores } }),
  history: () => request('/api/ai/history', { auth: true }),
};

// Persist auth after a successful register/login.
export function saveAuth(data) {
  if (data.token) localStorage.setItem('token', data.token);
  if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('isLoggedIn', 'true');
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('isLoggedIn');
}
