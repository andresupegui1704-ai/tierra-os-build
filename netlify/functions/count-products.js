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

    const res = await req('GET',
      `/open-apis/bitable/v1/apps/${BASE_ID}/tables/${PRODUCTS_TABLE_ID}/records?page_size=500`,
      null,
      TOKEN
    );

    const items = res.data?.items || [];
    return {
      statusCode: 200,
      body: JSON.stringify({
        total: items.length,
        names: items.map(r => r.fields?.name).filter(Boolean),
      }, null, 2),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
