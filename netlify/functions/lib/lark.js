// netlify/functions/lib/lark.js
// Client Lark Open API centralizzato
// Tierra OS v9.5 — Security Hardening
//
// Gestisce:
//  - Tenant access token con cache in-memory (warm Lambda)
//  - CRUD su tabelle Bitable (search, create, update)
//  - Mapping campi <-> record Lark

const LARK_APP_ID = process.env.LARK_APP_ID;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET;
const LARK_BASE_ID = process.env.LARK_BASE_ID;

const LARK_HOST = 'https://open.larksuite.com';

let tokenCache = { token: null, expiresAt: 0 };

/**
 * Recupera tenant_access_token Lark, con cache in-memory.
 * @returns {Promise<string>}
 */
async function getTenantToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.token;
  }
  if (!LARK_APP_ID || !LARK_APP_SECRET) {
    throw new Error('LARK_APP_ID or LARK_APP_SECRET not configured');
  }
  const res = await fetch(`${LARK_HOST}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: LARK_APP_ID,
      app_secret: LARK_APP_SECRET,
    }),
  });
  if (!res.ok) {
    throw new Error(`Lark auth failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Lark auth error: ${data.msg}`);
  }
  tokenCache = {
    token: data.tenant_access_token,
    expiresAt: now + (data.expire - 300) * 1000, // refresh 5min prima
  };
  return tokenCache.token;
}

/**
 * Cerca record in una tabella Bitable con filtro.
 * @param {string} tableId
 * @param {object} options { filter?, fieldNames?, pageSize? }
 * @returns {Promise<Array>} lista record
 */
async function searchRecords(tableId, options = {}) {
  const token = await getTenantToken();
  const url = `${LARK_HOST}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records/search`;
  const body = {
    page_size: options.pageSize || 100,
  };
  if (options.fieldNames) body.field_names = options.fieldNames;
  if (options.filter) body.filter = options.filter;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Lark search failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Lark search error: ${data.msg}`);
  }
  return data.data?.items || [];
}

/**
 * Crea un record in una tabella Bitable.
 * @param {string} tableId
 * @param {object} fields key/value dei campi (nomi field Lark)
 * @returns {Promise<object>} record creato
 */
async function createRecord(tableId, fields) {
  const token = await getTenantToken();
  const url = `${LARK_HOST}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records`;
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
  const token = await getTenantToken();
  const url = `${LARK_HOST}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records/${recordId}`;
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
 * Lark Date field accetta number (ms epoch) direttamente.
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
