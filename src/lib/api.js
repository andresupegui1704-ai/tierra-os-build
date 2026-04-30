// src/lib/api.js
// Client HTTP centralizzato per chiamate alle Netlify Functions.
// Usa cookie auth (HttpOnly) — credentials: 'include' è essenziale.
// Tierra OS v9.5 — Security Hardening

const API_BASE = '/.netlify/functions';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Wrapper fetch standard per le Netlify Functions.
 * @param {string} path es: 'auth-login'
 * @param {object} options { method, body, headers }
 * @returns {Promise<any>} body parsato
 */
async function request(path, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const url = `${API_BASE}/${path}`;

  const init = {
    method,
    credentials: 'include', // CRITICO: invia cookie tierra_session
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    throw new ApiError('Errore di rete. Controlla la connessione.', 0, null);
  }

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      `Errore HTTP ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data;
}

// === Auth ===
export const authApi = {
  login: (email, password) =>
    request('auth-login', { method: 'POST', body: { email, password } }),
  logout: () => request('auth-logout', { method: 'POST' }),
  me: () => request('auth-me', { method: 'GET' }),
};

// Generic helpers per future API
export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export { ApiError };
