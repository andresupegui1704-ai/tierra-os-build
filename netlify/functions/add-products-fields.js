const https = require('https');

const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;
const BASE_ID = process.env.LARK_BASE_ID;
const PRODUCTS_TABLE_ID = process.env.LARK_PRODUCTS_TABLE_ID;

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

exports.handler = async () => {
  try {
    const tokenRes = await req('POST', '/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });
    const TOKEN = tokenRes.tenant_access_token;

    // Campi da aggiungere (nome + tipo)
    const fields = [
      { field_name: 'name', type: 1 },                    // Text
      { field_name: 'category', type: 1 },                // Text  
      { field_name: 'subcategory', type: 1 },             // Text
      { field_name: 'price', type: 2 },                   // Number
      { field_name: 'price_alt', type: 2 },               // Number (per varianti tipo 15/25)
      { field_name: 'available', type: 7 },               // Checkbox
      { field_name: 'description', type: 1 },             // Text long
      { field_name: 'allergens', type: 1 },               // Text (G,L,E,N,F,S)
      { field_name: 'notes', type: 1 },                   // Text
    ];

    const results = [];
    for (const field of fields) {
      const res = await req('POST',
        `/open-apis/bitable/v1/apps/${BASE_ID}/tables/${PRODUCTS_TABLE_ID}/fields`,
        field,
        TOKEN
      );
      results.push({
        field: field.field_name,
        code: res.code,
        msg: res.msg,
        field_id: res.data?.field?.field_id,
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify(results, null, 2),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
