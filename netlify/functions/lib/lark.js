// netlify/functions/lib/lark.js
// Client Lark Open API centralizzato
// Tierra OS v9.5 — Security Hardening
// FIX: logging + auto-detect Feishu/Lark host con fallback

const LARK_APP_ID = process.env.LARK_APP_ID;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET;
const LARK_BASE_ID = process.env.LARK_BASE_ID;

const LARK_HOST = 'https://open.jp.larksuite.com';
const FEISHU_HOST = 'https://open.feishu.cn';

let tokenCache = { token: null, expiresAt: 0, host: null };

console.log('[lark] Module loaded. LARK_APP_ID:', LARK_APP_ID ? 'present' : 'MISSING');

/**
 * Recupera tenant_access_token Lark con auto-detect host.
 * Tenta Lark Suite prima, poi fallback Feishu.
 * @returns {Promise<{token: string, host: string}>}
 */
async function getTenantToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 60_000) {
    console.log('[getTenantToken] Using cached token, host:', tokenCache.host);
    return { token: tokenCache.token, host: tokenCache.host };
  }

  if (!LARK_APP_ID || !LARK_APP_SECRET) {
    throw new Error('LARK_APP_ID or LARK_APP_SECRET not configured');
  }

  // Try Lark Suite first, then Feishu fallback
  const hosts = [LARK_HOST, FEISHU_HOST];
  let lastError = null;

  for (const host of hosts) {
    try {
      console.log(`[getTenantToken] Attempting auth on host: ${host}`);
      const res = await fetch(`${host}/open-apis/auth/v3/tenant_access_token/internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: LARK_APP_ID,
          app_secret: LARK_APP_SECRET,
        }),
      });

      const data = await res.json();
      console.log(`[getTenantToken] Response from ${host}: status=${res.status}, code=${data.code}, msg=${data.msg}`);

      if (res.ok && data.code === 0) {
        tokenCache = {
          token: data.tenant_access_token,
          expiresAt: now + (data.expire - 300) * 1000,
          host: host,
        };
        console.log(`[getTenantToken] SUCCESS. Using host: ${host}`);
        return { token: tokenCache.token, host: tokenCache.host };
      }

      lastError = `HTTP ${res.status}, code=${data.code}, msg=${data.msg}`;
      console.log(`[getTenantToken] Failed on ${host}: ${lastError}`);
    } catch (err) {
      lastError = err.message;
      console.log(`[getTenantToken] Exception on ${host}: ${lastError}`);
    }
  }

  throw new Error(`Lark auth failed on all hosts. Last error: ${lastError}`);
}

/**
 * Cerca record in una tabella Bitable con filtro.
 * @param {string} tableId
 * @param {object} options { filter?, fieldNames?, pageSize? }
 * @returns {Promise<Array>} lista record
 */
async function searchRecords(tableId, options = {}) {
  console.log('[searchRecords] Called with tableId:', tableId, 'type:', typeof tableId);

  if (!tableId || typeof tableId !== 'string' || tableId.trim() === '') {
    const err = `searchRecords: tableId is missing or invalid. Received: ${JSON.stringify(tableId)}`;
    console.error('[searchRecords] FATAL:', err);
    throw new Error(err);
  }

  if (!LARK_BASE_ID) {
    throw new Error('searchRecords: LARK_BASE_ID is missing in env');
  }

  const { token, host } = await getTenantToken();
  console.log('[searchRecords] Got token from host:', host);

  const url = `${host}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records/search`;
  console.log('[searchRecords] URL:', url);

  const body = {
    page_size: options.pageSize || 100,
  };
  if (options.fieldNames) body.field_names = options.fieldNames;
  if (options.filter) body.filter = options.filter;

  console.log('[searchRecords] Request body:', JSON.stringify(body));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log('[searchRecords] Response: status=', res.status, 'code=', data.code, 'msg=', data.msg);

    if (!res.ok) {
      const errMsg = `Lark search failed: HTTP ${res.status}, code=${data.code}, msg=${data.msg}`;
      console.error('[searchRecords]', errMsg);
      throw new Error(errMsg);
    }

    if (data.code !== 0) {
      const errMsg = `Lark search error code=${data.code} msg=${data.msg} (tableId=${tableId}, baseId=${LARK_BASE_ID}, host=${host})`;
      console.error('[searchRecords]', errMsg);
      throw new Error(errMsg);
    }

    const items = data.data?.items || [];
    console.log('[searchRecords] Success. Returned', items.length, 'records');
    return items;
  } catch (err) {
    console.error('[searchRecords] Exception:', err.message);
    throw err;
  }
}

/**
 * Crea un record in una tabella Bitable.
 * @param {string} tableId
 * @param {object} fields key/value dei campi (nomi field Lark)
 * @returns {Promise<object>} record creato
 */
async function createRecord(tableId, fields) {
  const { token, host } = await getTenantToken();
  const url = `${host}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    throw new Error(`Lark create failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Lark create error: ${data.msg}`);
  }
  return data.data?.record;
}

/**
 * Aggiorna un record esistente.
 * @param {string} tableId
 * @param {string} recordId
 * @param {object} fields
 * @returns {Promise<object>}
 */
async function updateRecord(tableId, recordId, fields) {
  const { token, host } = await getTenantToken();
  const url = `${host}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records/${recordId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    throw new Error(`Lark update failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Lark update error: ${data.msg}`);
  }
  return data.data?.record;
}

/**
 * Converte timestamp ms a stringa formato Lark Date field.
 * @param {Date|number} d
 * @returns {number} ms epoch
 */
function toLarkDate(d) {
  if (d instanceof Date) return d.getTime();
  if (typeof d === 'number') return d;
  return Date.now();
}

module.exports = {
  getTenantToken,
  searchRecords,
  createRecord,
  updateRecord,
  toLarkDate,
};
