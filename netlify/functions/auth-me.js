// netlify/functions/auth-me.js
// GET /api/auth-me
// Tierra OS v9.5 — Security Hardening

const { requireAuth, CORS_HEADERS } = require('./lib/auth-middleware');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'method_not_allowed' }),
    };
  }

  const auth = requireAuth(event);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode,
      headers: CORS_HEADERS,
      body: auth.body,
    };
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      user: {
        user_id: auth.user.user_id,
        email: auth.user.email,
        name: auth.user.name,
        role: auth.user.role,
      },
    }),
  };
};
