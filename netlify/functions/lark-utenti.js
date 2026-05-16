// netlify/functions/lark-utenti.js
const { createRecord, searchRecords } = require('./lib/lark');
const { writeAuditLog, extractRequestMeta } = require('./lib/audit-log');
const crypto = require('crypto');

const LARK_UTENTI_TABLE_ID = process.env.LARK_UTENTI_TABLE_ID;

console.log('[lark-utenti] Module loaded. Table:', LARK_UTENTI_TABLE_ID);

exports.handler = async (event) => {
  const meta = extractRequestMeta(event);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'method_not_allowed' }),
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'invalid_json' }),
      };
    }

    const { user_id, nome, email, password, role, active } = body;

    console.log('[lark-utenti] Received user:', { user_id, nome, email, role });

    if (!user_id || !nome || !email || !password || !role) {
      console.error('[lark-utenti] Missing required fields');
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'missing_fields',
          required: ['user_id', 'nome', 'email', 'password', 'role'],
        }),
      };
    }

    if (!LARK_UTENTI_TABLE_ID) {
      console.error('[lark-utenti] LARK_UTENTI_TABLE_ID not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'utenti_table_not_configured' }),
      };
    }

    const existingUsers = await searchRecords(LARK_UTENTI_TABLE_ID, {
      filter: {
        conjunction: 'and',
        conditions: [
          {
            field_name: 'user_id',
            operator: 'is',
            value: [user_id],
          },
        ],
      },
    });

    if (existingUsers.length > 0) {
      console.log('[lark-utenti] User already exists:', user_id);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'user_already_exists',
          user_id,
          record_id: existingUsers[0].record_id,
        }),
      };
    }

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    const now = new Date().toISOString();

    const userRecord = await createRecord(LARK_UTENTI_TABLE_ID, {
      user_id,
      nome,
      email,
      password_hash: passwordHash,
      role,
      active: active || 'sì',
      created_at: now,
    });

    console.log('[lark-utenti] Created record:', userRecord.record_id);

    try {
      await writeAuditLog({
        action: 'user_created',
        user_id: 'system',
        resource: 'user',
        resource_id: user_id,
        details: { nome, email, role },
      });
    } catch (auditErr) {
      console.error('[lark-utenti] Audit log error:', auditErr.message);
    }

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        user_id,
        record_id: userRecord.record_id,
        message: 'User created',
        timestamp: now,
      }),
    };
  } catch (error) {
    console.error('[lark-utenti] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'internal_error',
        message: error.message,
      }),
    };
  }
};
