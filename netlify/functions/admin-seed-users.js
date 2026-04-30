// netlify/functions/admin-seed-users.js
// POST /api/admin-seed-users
// Endpoint ONE-SHOT per popolare i 6 utenti Tierra iniziali con bcrypt hash.
//
// SECURITY:
//  - Protetto da SEED_TOKEN env var (one-time secret, da rimuovere dopo seed)
//  - Idempotente: skippa utenti già esistenti (per email)
//  - Genera user_id deterministici per facilità debug
//
// Tierra OS v9.5 — Security Hardening

const { searchRecords, createRecord, toLarkDate } = require('./lib/lark');
const { hashPassword } = require('./lib/password');

const UTENTI_TABLE_ID = process.env.LARK_UTENTI_TABLE_ID;
const SEED_TOKEN = process.env.SEED_TOKEN;

// Le password sono passate nel body della richiesta (non hardcoded qui)
// Il body deve avere forma:
// {
//   token: "<SEED_TOKEN>",
//   users: [
//     { email, name, role, password },
//     ...
//   ]
// }

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'method_not_allowed' }) };
  }

  if (!SEED_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'seed_token_not_configured', message: 'SEED_TOKEN env var missing' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid_json' }) };
  }

  if (body.token !== SEED_TOKEN) {
    return { statusCode: 401, body: JSON.stringify({ error: 'invalid_seed_token' }) };
  }

  const users = Array.isArray(body.users) ? body.users : [];
  if (!users.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'no_users_provided' }) };
  }

  const results = [];

  for (const u of users) {
    const email = String(u.email || '').trim().toLowerCase();
    const name = String(u.name || '').trim();
    const role = String(u.role || 'staff').trim();
    const password = String(u.password || '');

    if (!email || !name || !password) {
      results.push({ email, status: 'skipped', reason: 'missing_fields' });
      continue;
    }
    if (!['owner', 'manager', 'staff'].includes(role)) {
      results.push({ email, status: 'skipped', reason: 'invalid_role' });
      continue;
    }

    try {
      // Check duplicato
      const existing = await searchRecords(UTENTI_TABLE_ID, {
        filter: {
          conjunction: 'and',
          conditions: [{ field_name: 'email', operator: 'is', value: [email] }],
        },
      });
      if (existing.length) {
        results.push({ email, status: 'skipped', reason: 'already_exists' });
        continue;
      }

      const userId = `usr_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString(36)}`;
      const passwordHash = await hashPassword(password);

      await createRecord(UTENTI_TABLE_ID, {
        user_id: userId,
        email,
        password_hash: passwordHash,
        name,
        role,
        active: true,
        created_at: toLarkDate(new Date()),
        failed_login_attempts: 0,
      });

      results.push({ email, status: 'created', user_id: userId, role });
    } catch (err) {
      console.error(`[seed] error for ${email}:`, err.message);
      results.push({ email, status: 'error', error: err.message });
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      results,
      reminder: 'IMPORTANTE: rimuovi SEED_TOKEN da Netlify env vars dopo il seeding.',
    }),
  };
};
