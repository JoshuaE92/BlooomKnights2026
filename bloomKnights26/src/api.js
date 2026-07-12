// Tiny API client for the GreenCart backend.
// In dev, paths are same-origin ('/api/...') and Vite proxies them to the
// backend (see vite.config.js) — no CORS. In prod, set VITE_API_BASE to the
// backend URL.
// Trailing slash stripped so "https://backend.com/" + "/api/..." can't
// produce a "//api/..." path.
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

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
    const error = new Error(data.message || data.error || `Request failed (${res.status})`);
    // Let callers branch on the response (e.g. login's needsVerification flag).
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  register: (username, email, password) =>
    request('/api/auth/register', { method: 'POST', body: { username, email, password } }),
  login: (identifier, password) =>
    request('/api/auth/login', { method: 'POST', body: { identifier, password } }),
  verifyEmail: (token) => request(`/api/auth/verify-email/${token}`),
  resendVerification: (email) =>
    request('/api/auth/resend-verification', { method: 'POST', body: { email } }),
  forgotPassword: (email) =>
    request('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) =>
    request(`/api/auth/reset-password/${token}`, { method: 'POST', body: { password } }),
  suggest: (prompt, stores) =>
    request('/api/ai/suggest', { method: 'POST', auth: true, body: { prompt, stores } }),
  history: () => request('/api/ai/history', { auth: true }),

  // catalog
  products: (stores) =>
    request(`/api/products${stores?.length ? `?stores=${stores.join(',')}` : ''}`),
  stores: (zip) => request(`/api/stores${zip ? `?zip=${zip}` : ''}`),

  // saved carts (dashboard)
  saveCart: (snapshot) => request('/api/carts', { method: 'POST', auth: true, body: snapshot }),
  carts: () => request('/api/carts', { auth: true }),
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
