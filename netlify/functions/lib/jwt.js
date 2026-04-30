// netlify/functions/lib/jwt.js
// Helper centralizzato per JWT sign/verify
// Tierra OS v9.5 — Security Hardening

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_DURATION_HOURS = parseInt(process.env.SESSION_DURATION_HOURS || '8', 10);

if (!JWT_SECRET) {
  // Fail loud al cold-start della function se manca il secret
  console.error('[jwt] CRITICAL: JWT_SECRET env var missing');
}

/**
 * Firma un JWT con payload utente.
 * @param {{user_id:string, email:string, role:string, name:string}} payload
 * @returns {string} JWT firmato HS256
 */
function signToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  return jwt.sign(
    {
      user_id: payload.user_id,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: `${SESSION_DURATION_HOURS}h`,
      issuer: 'tierra-os',
    }
  );
}

/**
 * Verifica firma e scadenza di un JWT.
 * @param {string} token
 * @returns {object|null} payload se valido, null altrimenti
 */
function verifyToken(token) {
  if (!JWT_SECRET) return null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'tierra-os',
    });
  } catch (err) {
    return null;
  }
}

/**
 * Estrae il token dal cookie tierra_session di un evento Netlify.
 * @param {object} event Netlify event
 * @returns {string|null}
 */
function extractTokenFromEvent(event) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)tierra_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Costruisce il Set-Cookie header per la sessione.
 * @param {string} token JWT
 * @returns {string} valore Set-Cookie
 */
function buildSessionCookie(token) {
  const maxAge = SESSION_DURATION_HOURS * 3600;
  return [
    `tierra_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${maxAge}`,
  ].join('; ');
}

/**
 * Cookie di logout (Max-Age=0 invalida il cookie).
 * @returns {string}
 */
function buildLogoutCookie() {
  return [
    'tierra_session=',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=0',
  ].join('; ');
}

module.exports = {
  signToken,
  verifyToken,
  extractTokenFromEvent,
  buildSessionCookie,
  buildLogoutCookie,
  SESSION_DURATION_HOURS,
};
