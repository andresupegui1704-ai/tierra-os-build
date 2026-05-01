// netlify/functions/lib/lark.js
// Client Lark Open API centralizzato
// Tierra OS v9.5 — Security Hardening
// FIX: logging dettagliato + validazione tableId + fallback API host

const LARK_APP_ID = process.env.LARK_APP_ID;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET;
const LARK_BASE_ID = process.env.LARK_BASE_ID;

// IMPORTANTE: Lark App ID inizia con "cli_" → Feishu (Cina)
// Se App ID inizia con "cli_a" → Feishu host
// Se App ID inizia con qualsiasi altro → Lark Suite international
// L'app "Tierra finance" usa cli_a96eb75ba5e1de17 → potrebbe essere FEISHU non LARK
// Proviamo prima Lark international, poi fallback Feishu se fallisce
const LARK_HOST = 'https://open.larksuite.com';
const FEISHU_HOST = 'https://open.feishu.cn';

// Logging env vars at module load (visibile in cold start logs)
console.log('[lark] Module loaded. ENV check:', {
  has_app_id: !!LARK_APP_ID,
  has_app_secret: !!LARK_APP_SECRET,
  has_base_id: !!LARK_BASE_ID,
  app_id_prefix: LARK_APP_ID ? LARK_APP_ID.substring(0, 6) : 'MISSING',
  base_id_value: LARK_BASE_ID || 'MISSING',
});

let tokenCache = { token: null, expiresAt: 0, host: null };

/**
 * Recupera tenant_access_token Lark con cache + auto-detect host (Lark vs Feishu).
 */
async function getTenantToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 60_000) {
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
      console.log(`[lark] Try auth on ${host}`);
      const res = await fetch(`${host}/open-apis/auth/v3/tenant_access_token/internal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_id: LARK_APP_ID,
          app_secret: LARK_APP_SECRET,
        }),
      });
      const data = await res.json();
      console.log(`[lark] Auth response from ${host}: code=${data.code} msg=${data.msg}`);

      if (res.ok && data.code === 0) {
        tokenCache = {
          token: data.tenant_access_token,
          expiresAt: now + (data.expire - 300) * 1000,
          host: host,
        };
        console.log(`[lark] Auth OK. Active host: ${host}`);
        return { token: tokenCache.token, host: tokenCache.host };
      }
      lastError = `HTTP ${res.status} code=${data.code} msg=${data.msg}`;
    } catch (err) {
      lastError = err.message;
      console.log(`[lark] Host ${host} threw: ${err.message}`);
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
  // === VALIDAZIONE INPUT ===
  console.log('[searchRecords] called with tableId:', JSON.stringify(tableId), 'type:', typeof tableId);

  if (!tableId || typeof tableId !== 'string' || tableId.trim() === '') {
    const err = `searchRecords: tableId is missing or invalid. Received: ${JSON.stringify(tableId)}`;
    console.error('[searchRecords] FATAL:', err);
    throw new Error(err);
  }

  if (!LARK_BASE_ID) {
    throw new Error('searchRecords: LARK_BASE_ID is missing in env');
  }

  // === GET TOKEN + HOST ===
  const { token, host } = await getTenantToken();

  const url = `${host}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records/search`;
  console.log('[searchRecords] URL:', url);

  const body = {
    page_size: options.pageSize || 100,
  };
  if (options.fieldNames) body.field_names = options.fieldNames;
  if (options.filter) body.filter = options.filter;

  console.log('[searchRecords] body:', JSON.stringify(body));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log(`[searchRecords] response: status=${res.status} code=${data.code} msg=${data.msg} items=${data.data?.items?.length ?? 0}`);

  if (!res.ok) {
    throw new Error(`Lark search HTTP ${res.status}: ${data.msg || 'unknown'}`);
  }
  if (data.code !== 0) {
    // Errori più informativi
    const errMsg = `Lark search error code=${data.code} msg=${data.msg} (tableId=${tableId}, baseId=${LARK_BASE_ID}, host=${host})`;
    console.error('[searchRecords]', errMsg);
    throw new Error(errMsg);
  }

  return data.data?.items || [];
}

/**
 * Crea un record in una tabella Bitable.
 */
async function createRecord(tableId, fields) {
  console.log('[createRecord] tableId:', tableId);

  if (!tableId || typeof tableId !== 'string') {
    throw new Error(`createRecord: tableId invalid. Received: ${JSON.stringify(tableId)}`);
  }
  if (!LARK_BASE_ID) {
    throw new Error('createRecord: LARK_BASE_ID is missing');
  }

  const { token, host } = await getTenantToken();
  const url = `${host}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records`;
  console.log('[createRecord] URL:', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  const data = await res.json();
  console.log(`[createRecord] response: status=${res.status} code=${data.code} msg=${data.msg}`);

  if (!res.ok) {
    throw new Error(`Lark create HTTP ${res.status}: ${data.msg || 'unknown'}`);
  }
  if (data.code !== 0) {
    throw new Error(`Lark create error code=${data.code} msg=${data.msg} (tableId=${tableId})`);
  }

  return data.data?.record;
}

/**
 * Aggiorna un record esistente.
 */
async function updateRecord(tableId, recordId, fields) {
  console.log('[updateRecord] tableId:', tableId, 'recordId:', recordId);

  if (!tableId || typeof tableId !== 'string') {
    throw new Error(`updateRecord: tableId invalid. Received: ${JSON.stringify(tableId)}`);
  }
  if (!recordId) {
    throw new Error('updateRecord: recordId is missing');
  }
  if (!LARK_BASE_ID) {
    throw new Error('updateRecord: LARK_BASE_ID is missing');
  }

  const { token, host } = await getTenantToken();
  const url = `${host}/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records/${recordId}`;
  console.log('[updateRecord] URL:', url);

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  const data = await res.json();
  console.log(`[updateRecord] response: status=${res.status} code=${data.code} msg=${data.msg}`);

  if (!res.ok) {
    throw new Error(`Lark update HTTP ${res.status}: ${data.msg || 'unknown'}`);
  }
  if (data.code !== 0) {
    throw new Error(`Lark update error code=${data.code} msg=${data.msg}`);
  }

  return data.data?.record;
}

/**
 * Converte timestamp ms a stringa formato Lark Date field.
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
