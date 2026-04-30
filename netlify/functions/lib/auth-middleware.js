// netlify/functions/lib/auth-middleware.js
// Middleware auth per Netlify Functions
// Tierra OS v9.5 — Security Hardening

const { verifyToken, extractTokenFromEvent } = require('./jwt');

const ROLE_HIERARCHY = {
  staff: 1,
  manager: 2,
  owner: 3,
};

/**
 * Verifica che la richiesta sia autenticata e (opzionale) abbia un ruolo minimo.
 *
 * @param {object} event Netlify event
 * @param {object} [options]
 * @param {'staff'|'manager'|'owner'} [options.requiredRole='staff']
 * @returns {{ok:true, user:object} | {ok:false, statusCode:number, body:string}}
 *
 * USAGE:
 *   const auth = requireAuth(event, { requiredRole: 'manager' });
 *   if (!auth.ok) return { statusCode: auth.statusCode, body: auth.body };
 *   const user = auth.user;
 */
function requireAuth(event, options = {}) {
  const requiredRole = options.requiredRole || 'staff';
  const token = extractTokenFromEvent(event);

  if (!token) {
    return {
      ok: false,
      statusCode: 401,
      body: JSON.stringify({ error: 'unauthenticated', message: 'Sessione non trovata' }),
    };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return {
      ok: false,
      statusCode: 401,
      body: JSON.stringify({ error: 'invalid_token', message: 'Sessione scaduta o non valida' }),
    };
  }

  const userRoleLevel = ROLE_HIERARCHY[payload.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  if (userRoleLevel < requiredLevel) {
    return {
      ok: false,
      statusCode: 403,
      body: JSON.stringify({ error: 'forbidden', message: 'Permessi insufficienti' }),
    };
  }

  return { ok: true, user: payload };
}

/**
 * Confronta due ruoli secondo la gerarchia.
 * @param {string} role
 * @param {string} minRole
 * @returns {boolean}
 */
function hasRole(role, minRole) {
  return (ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
}

/**
 * Headers CORS standard per le response.
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://ostierra.netlify.app',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

module.exports = {
  requireAuth,
  hasRole,
  CORS_HEADERS,
  ROLE_HIERARCHY,
};
