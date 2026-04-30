// netlify/functions/auth-logout.js
// POST /api/auth-logout
// Tierra OS v9.5 — Security Hardening

const { extractTokenFromEvent, verifyToken, buildLogoutCookie } = require('./lib/jwt');
const { writeAuditLog, extractRequestMeta } = require('./lib/audit-log');
const { CORS_HEADERS } = require('./lib/auth-middleware');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'method_not_allowed' }),
    };
  }

  const token = extractTokenFromEvent(event);
  const payload = token ? verifyToken(token) : null;
  const meta = extractRequestMeta(event);

  if (payload) {
    await writeAuditLog({
      user_id: payload.user_id,
      action: 'logout',
      resource: `email:${payload.email}`,
      ...meta,
    });
  }

  return {
    statusCode: 200,
    headers: {
      ...CORS_HEADERS,
      'Set-Cookie': buildLogoutCookie(),
    },
    body: JSON.stringify({ success: true }),
  };
};
