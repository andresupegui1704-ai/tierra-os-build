// netlify/functions/auth-login.js
// POST /api/auth-login
// Body: { email, password }
// Tierra OS v9.5 — Security Hardening

const { findUserByEmail, markLoginSuccess, incrementFailedLogins } = require('./lib/users');
const { verifyPassword } = require('./lib/password');
const { signToken, buildSessionCookie } = require('./lib/jwt');
const { writeAuditLog, extractRequestMeta } = require('./lib/audit-log');
const { CORS_HEADERS } = require('./lib/auth-middleware');

const MAX_FAILED_ATTEMPTS = 5;

exports.handler = async (event) => {
  // CORS preflight
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

  const meta = extractRequestMeta(event);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'invalid_json' }),
    };
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'missing_credentials', message: 'Email e password richieste' }),
    };
  }

  let user;
  try {
    user = await findUserByEmail(email);
  } catch (err) {
    console.error('[auth-login] findUserByEmail error:', err.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'server_error', message: 'Errore server, riprova' }),
    };
  }

  // Risposta generica per email-non-esiste e password-errata (no user enumeration)
  const genericFail = {
    statusCode: 401,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: 'invalid_credentials', message: 'Email o password errati' }),
  };

  if (!user) {
    await writeAuditLog({
      user_id: 'anonymous',
      action: 'login_failed',
      resource: `email:${email}`,
      ...meta,
      metadata: { reason: 'user_not_found' },
    });
    return genericFail;
  }

  if (!user.active) {
    await writeAuditLog({
      user_id: user.user_id,
      action: 'login_failed',
      resource: `email:${email}`,
      ...meta,
      metadata: { reason: 'account_inactive' },
    });
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'account_disabled', message: 'Account disattivato. Contatta l\'amministratore.' }),
    };
  }

  if (user.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
    await writeAuditLog({
      user_id: user.user_id,
      action: 'login_blocked',
      resource: `email:${email}`,
      ...meta,
      metadata: { failed_attempts: user.failed_login_attempts },
    });
    return {
      statusCode: 429,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'account_locked',
        message: 'Account bloccato per troppi tentativi falliti. Contatta l\'amministratore.',
      }),
    };
  }

  const passwordOk = await verifyPassword(password, user.password_hash);

  if (!passwordOk) {
    try {
      await incrementFailedLogins(user.record_id, user.failed_login_attempts);
    } catch (err) {
      console.error('[auth-login] incrementFailedLogins error:', err.message);
    }
    await writeAuditLog({
      user_id: user.user_id,
      action: 'login_failed',
      resource: `email:${email}`,
      ...meta,
      metadata: { reason: 'wrong_password', attempts: user.failed_login_attempts + 1 },
    });
    return genericFail;
  }

  // Login OK
  try {
    await markLoginSuccess(user.record_id);
  } catch (err) {
    console.error('[auth-login] markLoginSuccess error:', err.message);
  }

  const token = signToken({
    user_id: user.user_id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  await writeAuditLog({
    user_id: user.user_id,
    action: 'login_success',
    resource: `email:${email}`,
    ...meta,
  });

  return {
    statusCode: 200,
    headers: {
      ...CORS_HEADERS,
      'Set-Cookie': buildSessionCookie(token),
    },
    body: JSON.stringify({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }),
  };
};
