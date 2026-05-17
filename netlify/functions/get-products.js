// netlify/functions/get-products.js
// Legge tutti i prodotti da Lark Products table
// Ritorna: array di prodotti, oppure raggruppati per categoria

const https = require('https');

const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const BASE_ID = process.env.LARK_BASE_ID;
const PRODUCTS_TABLE_ID = process.env.LARK_PRODUCTS_TABLE_ID;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
  // CORS preflight
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

  try {
    console.log('[get-products] Starting...');

    if (!APP_ID || !APP_SECRET || !BASE_ID || !PRODUCTS_TABLE_ID) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'lark_not_configured' }),
      };
    }

    // 1. Get token
    const tokenRes = await req('POST', '/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });
    const TOKEN = tokenRes.tenant_access_token;

    // 2. Fetch all products
    const recordsRes = await req('GET',
      `/open-apis/bitable/v1/apps/${BASE_ID}/tables/${PRODUCTS_TABLE_ID}/records?page_size=500`,
      null,
      TOKEN
    );

    const items = recordsRes.data?.items || [];
    console.log(`[get-products] Fetched ${items.length} products`);

    // 3. Transform to UI-friendly format
    const products = items.map(item => {
      const f = item.fields || {};
      // Lark text fields può essere array di {text} oppure stringa
      const getText = (val) => {
        if (Array.isArray(val)) return val.map(v => v.text || v).join('');
        return val || '';
      };
      
      return {
        id: item.record_id,
        product_id: getText(f.product_id),
        nome: getText(f.name),
        category: getText(f.category),
        subcategory: getText(f.subcategory),
        prezzo: f.price || 0,
        prezzo_alt: f.price_alt || null,
        disponibile: f.available === true || f.available === 'true',
        ingredienti: getText(f.description),
        allergens: getText(f.allergens),
        notes: getText(f.notes),
      };
    });

    // 4. Group by category (compatibile con menuCatalog esistente)
    const grouped = {};
    for (const p of products) {
      const cat = p.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        total: products.length,
        products: products,
        grouped: grouped,
      }),
    };
  } catch (error) {
    console.error('[get-products] Error:', error.message);
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
