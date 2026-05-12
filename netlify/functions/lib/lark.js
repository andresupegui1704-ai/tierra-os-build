// netlify/functions/lib/lark.js
// Client Lark Open API centralizzato
// Tierra OS v9.5 — Security Hardening
// FIX: JP LARK SUBDOMAIN - pjpsysgnpdhz.jp.larksuite.com

const LARK_APP_ID = process.env.LARK_APP_ID;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET;
const LARK_BASE_ID = process.env.LARK_BASE_ID;

// CRITICAL: Use JP subdomain for this Lark instance
const LARK_HOST = 'https://pjpsysgnpdhz.jp.larksuite.com';

let tokenCache = { token: null, expiresAt: 0 };

console.log('[lark] Module loaded. LARK_APP_ID:', LARK_APP_ID ? 'present' : 'MISSING');
console.log('[lark] Using LARK_HOST:', LARK_HOST);

/**
 * Recupera tenant_access_token Lark (JP region only)
 * @returns {Promise<string>}
 */
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
      console.error('[getTenantToken] JSON parse error. Status:', res.status, 'Body:', bodyText.substring(0, 300));
      throw new Error(`Lark response is not valid JSON: ${parseErr.message}`);
    }

    console.log(`[getTenantToken] Response: status=${res.status}, code=${data.code}, msg=${data.msg}`);

    if (data.code !== 0) {
      throw new Error(`Lark auth failed: code=${data.code} msg=${data.msg}`);
    }

    tokenCache = {
      token: data.tenant_access_token,
      expiresAt: now + (data.expire * 1000),
    };

    console.log('[getTenantToken] Token cached, expires in', data.expire, 'seconds');
    return tokenCache.token;
  } catch (err) {
    console.error('[getTenantToken] Error:', err.message);
    throw err;
  }
}

/**
 * Search records in Lark Bitable
 */
async function searchRecords(tableId, filterFormula = '', pageSize = 100) {
  const token = await getTenantToken();

  try {
    console.log(`[searchRecords] Searching table=${tableId}, base=${LARK_BASE_ID}, pageSize=${pageSize}`);
    
    const url = new URL(`${LARK_HOST}/open-apis/bitable/v3/apps/${LARK_BASE_ID}/tables/${tableId}/records`);
    if (filterFormula) {
      url.searchParams.set('filter', filterFormula);
    }
    url.searchParams.set('page_size', pageSize);

    const res = await fetch(url.toString(), {
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
      console.error('[searchRecords] JSON parse error. Status:', res.status, 'Body:', bodyText.substring(0, 300));
      throw new Error(`Lark searchRecords response is not valid JSON: ${parseErr.message}`);
    }

    console.log(`[searchRecords] Response: status=${res.status}, code=${data.code}, msg=${data.msg}`);

    if (data.code !== 0) {
      throw new Error(`Lark search error code=${data.code} msg=${data.msg} (tableId=${tableId}, baseId=${LARK_BASE_ID}, host=${LARK_HOST})`);
    }

    return data.data.items || [];
  } catch (err) {
    console.error('[searchRecords] Exception:', err.message);
    throw err;
  }
}

/**
 * Get single record by ID
 */
async function getRecord(tableId, recordId) {
  const token = await getTenantToken();

  try {
    console.log(`[getRecord] Fetching record=${recordId}, table=${tableId}`);
    
    const res = await fetch(
      `${LARK_HOST}/open-apis/bitable/v3/apps/${LARK_BASE_ID}/tables/${tableId}/records/${recordId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error('[getRecord] JSON parse error. Status:', res.status, 'Body:', bodyText.substring(0, 300));
      throw new Error(`Lark getRecord response is not valid JSON: ${parseErr.message}`);
    }

    if (data.code !== 0) {
      throw new Error(`Lark get record error code=${data.code} msg=${data.msg}`);
    }

    return data.data.record;
  } catch (err) {
    console.error('[getRecord] Exception:', err.message);
    throw err;
  }
}

/**
 * Create record in Lark Bitable
 */
async function createRecord(tableId, fields) {
  const token = await getTenantToken();

  try {
    console.log(`[createRecord] Creating in table=${tableId}, fields=${Object.keys(fields).join(',')}`);
    
    const res = await fetch(
      `${LARK_HOST}/open-apis/bitable/v3/apps/${LARK_BASE_ID}/tables/${tableId}/records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    );

    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error('[createRecord] JSON parse error. Status:', res.status, 'Body:', bodyText.substring(0, 300));
      throw new Error(`Lark createRecord response is not valid JSON: ${parseErr.message}`);
    }

    if (data.code !== 0) {
      throw new Error(`Lark create record error code=${data.code} msg=${data.msg}`);
    }

    return data.data.record;
  } catch (err) {
    console.error('[createRecord] Exception:', err.message);
    throw err;
  }
}

/**
 * Update record in Lark Bitable
 */
async function updateRecord(tableId, recordId, fields) {
  const token = await getTenantToken();

  try {
    console.log(`[updateRecord] Updating record=${recordId}, table=${tableId}, fields=${Object.keys(fields).join(',')}`);
    
    const res = await fetch(
      `${LARK_HOST}/open-apis/bitable/v3/apps/${LARK_BASE_ID}/tables/${tableId}/records/${recordId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    );

    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error('[updateRecord] JSON parse error. Status:', res.status, 'Body:', bodyText.substring(0, 300));
      throw new Error(`Lark updateRecord response is not valid JSON: ${parseErr.message}`);
    }

    if (data.code !== 0) {
      throw new Error(`Lark update record error code=${data.code} msg=${data.msg}`);
    }

    return data.data.record;
  } catch (err) {
    console.error('[updateRecord] Exception:', err.message);
    throw err;
  }
}

/**
 * Converte Date a formato Lark (timestamp in millisecondi)
 */
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
