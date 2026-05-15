// netlify/functions/lib/lark.js
// Client Lark Open API centralizzato
// Tierra OS v9.5 — Fixed searchRecords (POST v1 endpoint)

const LARK_APP_ID = process.env.LARK_APP_ID;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET;
const LARK_BASE_ID = process.env.LARK_BASE_ID;

const LARK_HOST = 'https://open.larksuite.com';

let tokenCache = { token: null, expiresAt: 0 };

console.log('[lark] Module loaded. LARK_APP_ID:', LARK_APP_ID ? 'present' : 'MISSING');
console.log('[lark] LARK_HOST:', LARK_HOST);
console.log('[lark] LARK_BASE_ID:', LARK_BASE_ID ? LARK_BASE_ID.substring(0, 8) + '...' : 'MISSING');

async function getTenantToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 60_000) {
    console.log('[getTenantToken] Token cached, expires in', Math.floor((tokenCache.expiresAt - now) / 1000), 'seconds');
    return tokenCache.token;
  }

  if (!LARK_APP_ID || !LARK_APP_SECRET) {
    throw new Error('LARK_APP_ID or LARK_APP_SECRET not configured');
  }

  try {
    console.log(`[getTenantToken] Fetching token from ${LARK_HOST}`);
    const res = await fetch(`${LARK_HOST}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: LARK_APP_ID,
        app_secret: LARK_APP_SECRET,
      }),
    });

    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error('[getTenantToken] JSON parse error. Status:', res.status);
      throw new Error(`Lark token response is not valid JSON`);
    }

    console.log(`[getTenantToken] Response: status=${res.status}, code=${data.code}`);

    if (data.code !== 0) {
      throw new Error(`Lark auth failed: code=${data.code} msg=${data.msg}`);
    }

    tokenCache = {
      token: data.tenant_access_token,
      expiresAt: now + (data.expire * 1000),
    };

    return tokenCache.token;
  } catch (err) {
    console.error('[getTenantToken] Error:', err.message);
    throw err;
  }
}

async function searchRecords(tableId, filterOrPayload = {}, pageSize = 100) {
  const token = await getTenantToken();

  let requestBody;
  if (typeof filterOrPayload === 'string') {
    console.log(`[searchRecords] Legacy string filter detected`);
    requestBody = { page_size: pageSize };
  } else if (filterOrPayload && typeof filterOrPayload === 'object') {
    requestBody = {
      page_size: filterOrPayload.page_size || pageSize,
      ...filterOrPayload,
    };
  } else {
    requestBody = { page_size: pageSize };
  }

  try {
    console.log(`[searchRecords] table=${tableId}, base=${LARK_BASE_ID}`);
    
    const url = `${LARK_HOST}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records/search`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(requestBody),
    });

    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error('[searchRecords] JSON parse error. Status:', res.status);
      throw new Error(`Lark searchRecords response is not valid JSON`);
    }

    console.log(`[searchRecords] Response: status=${res.status}, code=${data.code}, items=${data?.data?.items?.length || 0}`);

    if (data.code !== 0) {
      throw new Error(`Lark search error code=${data.code} msg=${data.msg}`);
    }

    return data.data.items || [];
  } catch (err) {
    console.error('[searchRecords] Exception:', err.message);
    throw err;
  }
}

async function getRecord(tableId, recordId) {
  const token = await getTenantToken();

  try {
    console.log(`[getRecord] Fetching record=${recordId}, table=${tableId}`);
    
    const url = `${LARK_HOST}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records/${recordId}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      throw new Error(`Lark getRecord response is not valid JSON`);
    }

    if (data.code !== 0) {
      throw new Error(`Lark get record error code=${data.code}`);
    }

    return data.data.record;
  } catch (err) {
    console.error('[getRecord] Exception:', err.message);
    throw err;
  }
}

async function createRecord(tableId, fields) {
  const token = await getTenantToken();

  try {
    console.log(`[createRecord] table=${tableId}, fields=${Object.keys(fields).join(',')}`);
    
    const url = `${LARK_HOST}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ fields }),
    });

    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      throw new Error(`Lark createRecord response is not valid JSON`);
    }

    console.log(`[createRecord] Response: status=${res.status}, code=${data.code}`);

    if (data.code !== 0) {
      throw new Error(`Lark create record error code=${data.code}`);
    }

    return data.data.record;
  } catch (err) {
    console.error('[createRecord] Exception:', err.message);
    throw err;
  }
}

async function updateRecord(tableId, recordId, fields) {
  const token = await getTenantToken();

  try {
    console.log(`[updateRecord] record=${recordId}, table=${tableId}`);
    
    const url = `${LARK_HOST}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records/${recordId}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ fields }),
    });

    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      throw new Error(`Lark updateRecord response is not valid JSON`);
    }

    if (data.code !== 0) {
      throw new Error(`Lark update record error code=${data.code}`);
    }

    return data.data.record;
  } catch (err) {
    console.error('[updateRecord] Exception:', err.message);
    throw err;
  }
}

function toLarkDate(date) {
  return Math.floor(date.getTime() / 1000);
}

module.exports = {
  getTenantToken,
  searchRecords,
  getRecord,
  createRecord,
  updateRecord,
  toLarkDate,
};
ENDFILEgit add netlify/functions/lib/lark.js
git commit -m "fix(lark): use POST search v1 endpoint and open.larksuite.com host"
git push origin main

