// netlify/functions/lark-prenotazioni.js
// ════════════════════════════════════════════════════════════════════
// Tierra OS v9 — Lark Base CRUD Prenotazioni
// ════════════════════════════════════════════════════════════════════
// Endpoint: POST /.netlify/functions/lark-prenotazioni
// Actions: create | update | delete | list
//
// Body esempio:
//   { "action": "create", "fields": { ... } }
//   { "action": "update", "recordId": "rec123", "fields": {...} }
//   { "action": "delete", "recordId": "rec123" }
//   { "action": "list", "pageSize": 100 }
//
// Response: { ok: true, recordId, fields } | { ok: false, error }
// ════════════════════════════════════════════════════════════════════

const LARK_APP_ID     = process.env.LARK_APP_ID;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET;
const BASE_ID         = process.env.LARK_BASE_ID;
const TABLE_ID        = process.env.LARK_PRENOTAZIONI_TABLE_ID;

// ─── Tenant Access Token (cache 1h) ──────────────────────────────────────────
let _tokenCache = { token: null, exp: 0 };

async function getTenantToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.exp) {
    return _tokenCache.token;
  }

  if (!LARK_APP_ID || !LARK_APP_SECRET) {
    throw new Error("LARK_APP_ID o LARK_APP_SECRET mancanti");
  }

  const res = await fetch("https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error("Lark token failed: " + (data.msg || JSON.stringify(data)));
  }

  _tokenCache.token = data.tenant_access_token;
  _tokenCache.exp   = Date.now() + (data.expire - 60) * 1000; // refresh 60s prima della scadenza
  return _tokenCache.token;
}

// ─── Normalizza fields per Lark Base ────────────────────────────────────────
// Lark Base accetta diversi tipi: text, number, date (ms), single_select (string), etc.
function normalizeFields(input) {
  const out = {};
  for (const [k, v] of Object.entries(input || {})) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

// ─── Handler principale ──────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    if (!BASE_ID || !TABLE_ID) {
      throw new Error("LARK_BASE_ID o LARK_PRENOTAZIONI_TABLE_ID mancanti");
    }

    const token = await getTenantToken();
    const baseUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/records`;
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action || (event.httpMethod === "GET" ? "list" : "create");

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    };

    // ─── CREATE ─────────────────────────────────────────────────────
    if (action === "create") {
      const fields = normalizeFields(body.fields);
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ fields }),
      });
      const data = await res.json();
      if (data.code !== 0) {
        throw new Error("Lark create failed: " + (data.msg || JSON.stringify(data)));
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          recordId: data.data.record.record_id,
          fields: data.data.record.fields,
        }),
      };
    }

    // ─── UPDATE ─────────────────────────────────────────────────────
    if (action === "update") {
      if (!body.recordId) throw new Error("recordId mancante");
      const fields = normalizeFields(body.fields);
      const res = await fetch(`${baseUrl}/${body.recordId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ fields }),
      });
      const data = await res.json();
      if (data.code !== 0) {
        throw new Error("Lark update failed: " + (data.msg || JSON.stringify(data)));
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          recordId: data.data.record.record_id,
          fields: data.data.record.fields,
        }),
      };
    }

    // ─── DELETE ─────────────────────────────────────────────────────
    if (action === "delete") {
      if (!body.recordId) throw new Error("recordId mancante");
      const res = await fetch(`${baseUrl}/${body.recordId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.code !== 0 && data.code !== 1254030) {
        // 1254030 = record già cancellato, OK
        throw new Error("Lark delete failed: " + (data.msg || JSON.stringify(data)));
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true }),
      };
    }

    // ─── LIST ───────────────────────────────────────────────────────
    if (action === "list") {
      const pageSize = Math.min(body.pageSize || 100, 500);
      const qs = new URLSearchParams({ page_size: String(pageSize) });
      if (body.pageToken) qs.append("page_token", body.pageToken);
      if (body.filter)    qs.append("filter", body.filter);

      const res = await fetch(`${baseUrl}?${qs}`, {
        method: "GET",
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.code !== 0) {
        throw new Error("Lark list failed: " + (data.msg || JSON.stringify(data)));
      }

      const items = (data.data?.items || []).map(r => ({
        recordId: r.record_id,
        fields: r.fields,
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          items,
          hasMore: data.data?.has_more || false,
          pageToken: data.data?.page_token || null,
          total: data.data?.total || items.length,
        }),
      };
    }

    throw new Error("Action non riconosciuta: " + action);

  } catch (e) {
    console.error("[lark-prenotazioni]", e.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};
