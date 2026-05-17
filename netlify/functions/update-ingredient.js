// netlify/functions/update-ingredient.js
// Update ingrediente (toggle disponibile, edit nome/categoria/note)

const https = require('https');

const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const BASE_ID = process.env.LARK_BASE_ID;
const TABLE_ID = process.env.LARK_INGREDIENTI_TABLE_ID;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const r = https.request({ hostname: 'open.larksuite.com', path, method, headers }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (!['PATCH', 'PUT', 'POST'].includes(event.httpMethod)) {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'method_not_allowed' }) };
  }

  try {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'invalid_json' }) };
    }

    const { record_id, fields } = body;
    if (!record_id) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'missing_record_id' }) };
    }
    if (!fields || typeof fields !== 'object') {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'missing_fields_object' }) };
    }

    if (!APP_ID || !APP_SECRET || !BASE_ID || !TABLE_ID) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'lark_not_configured' }) };
    }

    const tokenRes = await req('POST', '/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });
    const TOKEN = tokenRes.tenant_access_token;

    const larkFields = {};
    for (const [key, value] of Object.entries(fields)) {
      if (key === 'disponibile') {
        larkFields[key] = Boolean(value);
      } else {
        larkFields[key] = value;
      }
    }

    const updateRes = await req('PUT',
      `/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/records/${record_id}`,
      { fields: larkFields },
      TOKEN
    );

    if (updateRes.code !== 0) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'lark_error', code: updateRes.code, message: updateRes.msg }) };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        record_id,
        updated_fields: Object.keys(larkFields),
      }),
    };
  } catch (error) {
    console.error('[update-ingredient] Error:', error.message);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'internal_error', message: error.message }) };
  }
};
