// netlify/functions/create-product.js
// Crea un nuovo prodotto in Lark Products table
// Use case: aggiungi piatto da Tierra OS

const https = require('https');

const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const BASE_ID = process.env.LARK_BASE_ID;
const PRODUCTS_TABLE_ID = process.env.LARK_PRODUCTS_TABLE_ID;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
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
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'invalid_json' }),
      };
    }

    const { fields } = body;

    if (!fields || typeof fields !== 'object') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'missing_fields_object',
          required: ['nome', 'category', 'prezzo'] 
        }),
      };
    }

    if (!fields.nome || !fields.category || fields.prezzo === undefined) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          error: 'missing_required_fields',
          required: ['nome', 'category', 'prezzo'] 
        }),
      };
    }

    console.log('[create-product] Creating new product:', fields.nome);

    if (!APP_ID || !APP_SECRET || !BASE_ID || !PRODUCTS_TABLE_ID) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'lark_not_configured' }),
      };
    }

    const tokenRes = await req('POST', '/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });
    const TOKEN = tokenRes.tenant_access_token;

    const fieldMapping = {
      nome: 'name',
      prezzo: 'price',
      prezzo_alt: 'price_alt',
      disponibile: 'available',
      ingredienti: 'description',
    };

    const larkFields = {};
    for (const [key, value] of Object.entries(fields)) {
      const larkKey = fieldMapping[key] || key;
      if (larkKey === 'price' || larkKey === 'price_alt') {
        larkFields[larkKey] = parseFloat(value) || 0;
      } else if (larkKey === 'available') {
        larkFields[larkKey] = Boolean(value);
      } else {
        larkFields[larkKey] = value || '';
      }
    }

    if (larkFields.available === undefined) larkFields.available = true;
    if (!larkFields.description) larkFields.description = '';
    if (!larkFields.subcategory) larkFields.subcategory = '';

    console.log('[create-product] Lark fields:', larkFields);

    const createRes = await req('POST',
      `/open-apis/bitable/v1/apps/${BASE_ID}/tables/${PRODUCTS_TABLE_ID}/records`,
      { fields: larkFields },
      TOKEN
    );

    if (createRes.code !== 0) {
      console.error('[create-product] Lark error:', createRes);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'lark_error',
          code: createRes.code,
          message: createRes.msg,
        }),
      };
    }

    const newRecord = createRes.data.record;
    console.log('[create-product] Created successfully:', newRecord.record_id);

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        record_id: newRecord.record_id,
        record: newRecord,
        message: 'Product created successfully',
      }),
    };
  } catch (error) {
    console.error('[create-product] Error:', error.message);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'internal_error',
        message: error.message,
      }),
    };
  }
};
