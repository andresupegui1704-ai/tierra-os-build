const https = require('https');
const crypto = require('crypto');

const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const BASE_ID = process.env.LARK_BASE_ID;
const UTENTI_TABLE_ID = process.env.LARK_UTENTI_TABLE_ID;

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

// bcrypt hash per password 'anguca17'
const PASSWORD_HASH = '$2b$10$lcjURww7NV6WkoyVai5YJu/fxvtPk8JMbo0Do21h0qewFbcd7oYvC';

exports.handler = async (event) => {
  console.log('[seed-owner] Starting...');
  console.log('[seed-owner] APP_ID:', APP_ID ? 'set' : 'MISSING');
  console.log('[seed-owner] BASE_ID:', BASE_ID ? 'set' : 'MISSING');
  console.log('[seed-owner] UTENTI_TABLE_ID:', UTENTI_TABLE_ID ? 'set' : 'MISSING');

  try {
    // Step 1: Get token
    console.log('[seed-owner] Getting token...');
    const tokenRes = await req('POST', '/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });
    const TOKEN = tokenRes.tenant_access_token;
    console.log('[seed-owner] Token obtained:', TOKEN.substring(0, 20) + '...');

    // Step 2: Search for existing user
    console.log('[seed-owner] Searching for existing user...');
    const searchRes = await req('POST',
      `/open-apis/bitable/v1/apps/${BASE_ID}/tables/${UTENTI_TABLE_ID}/records/search`,
      {
        filter: {
          conjunction: 'and',
          conditions: [{
            field_name: 'email',
            operator: 'is',
            value: ['andresupegui1704@gmail.com'],
          }],
        },
      },
      TOKEN
    );

    if (searchRes.data && searchRes.data.items && searchRes.data.items.length > 0) {
      console.log('[seed-owner] User already exists. Deleting old record...');
      const oldRecord = searchRes.data.items[0];
      await req('DELETE',
        `/open-apis/bitable/v1/apps/${BASE_ID}/tables/${UTENTI_TABLE_ID}/records/${oldRecord.record_id}`,
        null,
        TOKEN
      );
      console.log('[seed-owner] Old record deleted:', oldRecord.record_id);
    }

    // Step 3: Create new owner user
    console.log('[seed-owner] Creating new owner user...');
    const createRes = await req('POST',
      `/open-apis/bitable/v1/apps/${BASE_ID}/tables/${UTENTI_TABLE_ID}/records`,
      {
        fields: {
          user_id: 'andresupegui1704@gmail.com',
          nome: 'Andres',
          email: 'andresupegui1704@gmail.com',
          password_hash: PASSWORD_HASH,
          role: 'owner',
          active: 'sì',
        },
      },
      TOKEN
    );

    if (createRes.code !== 0) {
      throw new Error(`Lark error ${createRes.code}: ${createRes.msg}`);
    }

    const recordId = createRes.data.record.record_id;
    console.log('[seed-owner] ✅ User created:', recordId);

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: 'Owner user created',
        record_id: recordId,
      }),
    };
  } catch (error) {
    console.error('[seed-owner] ❌ Error:', error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
