// netlify/functions/get-ingredients.js
// Legge tutti gli ingredienti da Lark Ingredienti table

const https = require('https');

const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const BASE_ID = process.env.LARK_BASE_ID;
const TABLE_ID = process.env.LARK_INGREDIENTI_TABLE_ID;

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
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'method_not_allowed' }) };
  }

  try {
    if (!APP_ID || !APP_SECRET || !BASE_ID || !TABLE_ID) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'lark_not_configured' }) };
    }

    const tokenRes = await req('POST', '/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });
    const TOKEN = tokenRes.tenant_access_token;

    const listRes = await req('GET',
      `/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/records?page_size=500`,
      null, TOKEN
    );

    if (listRes.code !== 0) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'lark_error', message: listRes.msg }) };
    }

    const ingredienti = (listRes.data?.items || []).map(item => {
      const f = item.fields || {};
      // Lark Text fields possono arrivare come array di {text: "..."} o stringhe
      const text = (val) => {
        if (Array.isArray(val)) return val.map(v => v.text || v).join('');
        return val || '';
      };
      return {
        id: item.record_id,
        ingredient_id: text(f.ingredient_id),
        nome: text(f.nome),
        categoria: f.categoria || '',
        disponibile: f.disponibile === true,
        note: text(f.note),
      };
    });

    // Raggruppa per categoria
    const grouped = ingredienti.reduce((acc, ing) => {
      const cat = ing.categoria || 'Altro';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(ing);
      return acc;
    }, {});

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        total: ingredienti.length,
        ingredienti,
        grouped,
      }),
    };
  } catch (error) {
    console.error('[get-ingredients] Error:', error.message);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'internal_error', message: error.message }) };
  }
};
