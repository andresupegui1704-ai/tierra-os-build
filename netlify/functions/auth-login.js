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
  console.log('[auth-login] START');
  
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
  console.log('[auth-login] meta:', meta);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    console.error('[auth-login] JSON parse error:', err.message);
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'invalid_json' }),
    };
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  console.log('[auth-login] email:', email);

  if (!email || !password) {
    console.log('[auth-login] missing credentials');
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'missing_credentials', message: 'Email e password richieste' }),
    };
  }

  let user;
  try {
    console.log('[auth-login] calling findUserByEmail...');
    user = await findUserByEmail(email);
    console.log('[auth-login] findUserByEmail result:', user ? 'found' : 'not found');
  } catch (err) {
    console.error('[auth-login] findUserByEmail error:', err.message, err.stack);
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
    console.log('[auth-login] user not found');
    try {
      await writeAuditLog({
        user_id: 'anonymous',
        action: 'login_failed',
        resource: `email:${email}`,
        ...meta,
        metadata: { reason: 'user_not_found' },
      });
    } catch (auditErr) {
      console.error('[auth-login] audit log error (user not found):', auditErr.message);
    }
    return genericFail;
  }

  if (!user.active) {
    console.log('[auth-login] account inactive');
    try {
      await writeAuditLog({
        user_id: user.user_id,
        action: 'login_failed',
        resource: `email:${email}`,
        ...meta,
        metadata: { reason: 'account_inactive' },
      });
    } catch (auditErr) {
      console.error('[auth-login] audit log error (inactive):', auditErr.message);
    }
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'account_disabled', message: 'Account disattivato. Contatta l\'amministratore.' }),
    };
  }

  if (user.failed_login_attempts >= MAX_FAILED_ATTEMPTS) {
    console.log('[auth-login] account locked');
    try {
      await writeAuditLog({
        user_id: user.user_id,
        action: 'login_blocked',
        resource: `email:${email}`,
        ...meta,
        metadata: { failed_attempts: user.failed_login_attempts },
      });
    } catch (auditErr) {
      console.error('[auth-login] audit log error (locked):', auditErr.message);
    }
    return {
      statusCode: 429,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'account_locked',
        message: 'Account bloccato per troppi tentativi falliti. Contatta l\'amministratore.',
      }),
    };
  }

  console.log('[auth-login] verifying password...');
  const passwordOk = await verifyPassword(password, user.password_hash);
  console.log('[auth-login] password result:', passwordOk);

  if (!passwordOk) {
    console.log('[auth-login] wrong password');
    try {
      await incrementFailedLogins(user.record_id, user.failed_login_attempts);
    } catch (err) {
      console.error('[auth-login] incrementFailedLogins error:', err.message);
    }
    try {
      await writeAuditLog({
        user_id: user.user_id,
        action: 'login_failed',
        resource: `email:${email}`,
        ...meta,
        metadata: { reason: 'wrong_password', attempts: user.failed_login_attempts + 1 },
      });
    } catch (auditErr) {
      console.error('[auth-login] audit log error (wrong password):', auditErr.message);
    }
    return genericFail;
  }

  // Login OK
  console.log('[auth-login] login success, marking login...');
  try {
    await markLoginSuccess(user.record_id);
  } catch (err) {
    console.error('[auth-login] markLoginSuccess error:', err.message);
  }

  console.log('[auth-login] signing token...');
  const token = signToken({
    user_id: user.user_id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  try {
    await writeAuditLog({
      user_id: user.user_id,
      action: 'login_success',
      resource: `email:${email}`,
      ...meta,
    });
  } catch (auditErr) {
    console.error('[auth-login] audit log error (success):', auditErr.message);
  }

  console.log('[auth-login] returning success');
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
