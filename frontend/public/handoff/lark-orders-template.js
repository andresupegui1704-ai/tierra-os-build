// netlify/functions/lark-orders.js
// ════════════════════════════════════════════════════════════════════
// Tierra OS v1.0 — Lark Base CRUD per "Ordini" (al tavolo / delivery / asporto)
// Modello speculare a lark-prenotazioni.js v9.2.1
// ════════════════════════════════════════════════════════════════════
// Endpoint: POST /.netlify/functions/lark-orders
// Actions:  create | update | list | delete
//
// ENV richieste su Netlify:
//   - LARK_APP_ID                  (cli_a96eb75ba5e1de17)
//   - LARK_APP_SECRET              (********MAQS)
//   - LARK_BASE_ID                 (DWpvwpxsViYlMskDFr6jrUccpug)
//   - LARK_ORDINI_TABLE_ID         (tbl... — tabella "Ordini" Lark)
//   - TIERRA_SITE_SHARED_SECRET    (opzionale, validazione header X-Tierra-Source-Token)
//
// SCHEMA Lark "Ordini" (singola colonna API-readable, come da pattern v9.2):
//   - order_id (TEXT key) → JSON serializzato di tutti i campi (vedi serializeFields)
//   - status_label (TEXT) → "open" | "paid" | "completed" | "cancelled"
//   - customer_label (TEXT) → es. "Tavolo E3" o nome cliente
//   - total_eur (NUMBER, opzionale) → totale per filtri/aggregati
//
// Body esempio:
//   { "action": "create", "fields": { order_id, service_type, table, customer_name, total, items, status, ... } }
//   { "action": "update", "order_id": "ord-uuid", "fields": { status: "paid", paid_at: "..." } }
//   { "action": "list", "pageSize": 50, "filter": { service_type: "table" } }
//   { "action": "delete", "order_id": "ord-uuid" }  // soft (status=cancelled)
//
// Response: { ok: true, recordId, fields } | { ok: false, error }
// ════════════════════════════════════════════════════════════════════

const APP_ID                  = process.env.LARK_APP_ID;
const APP_SECRET              = process.env.LARK_APP_SECRET;
const BASE_ID                 = process.env.LARK_BASE_ID;
const ORDINI_TABLE_ID         = process.env.LARK_ORDINI_TABLE_ID;
const SITE_SHARED_SECRET      = process.env.TIERRA_SITE_SHARED_SECRET || "";

const LARK_API = "https://open.larksuite.com/open-apis";

// ─── Body parser robusto ─────────────────────────────────────────────
function parseBody(eventBody) {
  if (!eventBody) return {};
  if (typeof eventBody === "object") return eventBody;
  try {
    return JSON.parse(eventBody);
  } catch (e) {
    throw new Error("Invalid JSON body: " + e.message);
  }
}

// ─── Tenant token (cache 90 min) ─────────────────────────────────────
let _tokenCache = { token: null, exp: 0 };

async function getTenantToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.exp) return _tokenCache.token;
  if (!APP_ID || !APP_SECRET) throw new Error("LARK_APP_ID / LARK_APP_SECRET mancanti");

  const res = await fetch(`${LARK_API}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const data = await res.json();
  if (!res.ok || !data.tenant_access_token) {
    throw new Error("Lark auth failed: " + (data.msg || JSON.stringify(data)));
  }
  _tokenCache.token = data.tenant_access_token;
  _tokenCache.exp = Date.now() + (data.expire - 60) * 1000;
  return _tokenCache.token;
}

// ─── Helper: serializza tutti i campi in 1 colonna TEXT (come booking_id) ──
function serializeFields(fields) {
  const safe = {};
  for (const k of Object.keys(fields || {})) {
    const v = fields[k];
    safe[k] = (v === null || v === undefined) ? "" : v;
  }
  return JSON.stringify(safe);
}

function deserializeFields(text) {
  try { return JSON.parse(text || "{}"); } catch (_) { return {}; }
}

// ─── Build label fields (per visibilità Lark UI) ─────────────────────
function buildLarkRecord(fields) {
  const order_id = fields.order_id || "";
  const status   = fields.status || "open";
  const customer = fields.customer_name || (fields.table ? `Tavolo ${fields.table}` : "");
  const total    = Number(fields.total) || 0;

  return {
    fields: {
      order_id: serializeFields(fields),
      // Optional helper columns (create them in Lark for filtering):
      status_label:    status,
      customer_label:  customer,
      total_eur:       total,
    },
  };
}

// ─── Lark CRUD primitives ────────────────────────────────────────────
async function larkCreate(token, payload) {
  const url = `${LARK_API}/bitable/v1/apps/${BASE_ID}/tables/${ORDINI_TABLE_ID}/records`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.code !== 0) {
    throw new Error("Lark create failed: " + (data.msg || JSON.stringify(data)));
  }
  return data.data?.record;
}

async function larkSearch(token, filter = {}, pageSize = 50) {
  // Search by serialized order_id field. We list all records and filter client-side
  // (Lark filter SDK is limited on TEXT columns containing JSON).
  const url = `${LARK_API}/bitable/v1/apps/${BASE_ID}/tables/${ORDINI_TABLE_ID}/records?page_size=${Math.min(pageSize, 100)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || data.code !== 0) {
    throw new Error("Lark list failed: " + (data.msg || JSON.stringify(data)));
  }
  const items = (data.data?.items || []).map(r => {
    const text = r.fields?.order_id;
    const parsed = typeof text === "string" ? deserializeFields(text)
                  : (Array.isArray(text) ? deserializeFields(text.map(t => t.text || "").join("")) : {});
    return { recordId: r.record_id, fields: parsed, raw: r.fields };
  });
  // Client-side filter
  let out = items;
  for (const [k, v] of Object.entries(filter || {})) {
    if (v === undefined || v === null || v === "") continue;
    out = out.filter(it => String(it.fields[k] ?? "") === String(v));
  }
  return out;
}

async function larkFindByOrderId(token, orderId) {
  const matches = await larkSearch(token, {}, 100);
  return matches.find(m => m.fields.order_id === orderId) || null;
}

async function larkUpdate(token, recordId, payload) {
  const url = `${LARK_API}/bitable/v1/apps/${BASE_ID}/tables/${ORDINI_TABLE_ID}/records/${recordId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || data.code !== 0) {
    throw new Error("Lark update failed: " + (data.msg || JSON.stringify(data)));
  }
  return data.data?.record;
}

async function larkDelete(token, recordId) {
  const url = `${LARK_API}/bitable/v1/apps/${BASE_ID}/tables/${ORDINI_TABLE_ID}/records/${recordId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || data.code !== 0) {
    throw new Error("Lark delete failed: " + (data.msg || JSON.stringify(data)));
  }
  return true;
}

// ─── Handler principale ──────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Tierra-Source-Token, Idempotency-Key",
    "Content-Type":                 "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  // Optional shared-secret validation for incoming pushes from the site
  if (SITE_SHARED_SECRET) {
    const provided = event.headers?.["x-tierra-source-token"]
                   || event.headers?.["X-Tierra-Source-Token"];
    if (provided && provided !== SITE_SHARED_SECRET) {
      return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: "Invalid source token" }) };
    }
  }

  try {
    if (!BASE_ID || !ORDINI_TABLE_ID) {
      throw new Error("LARK_BASE_ID / LARK_ORDINI_TABLE_ID mancanti");
    }
    const body   = parseBody(event.body);
    const action = body.action || (event.httpMethod === "GET" ? "list" : "create");
    const token  = await getTenantToken();

    // ─── CREATE ─────────────────────────────────────────────
    if (action === "create") {
      const fields = body.fields || {};
      if (!fields.order_id) throw new Error("fields.order_id mancante");

      // Idempotency: se esiste già un record con stesso order_id, ritorna quello
      const existing = await larkFindByOrderId(token, fields.order_id);
      if (existing) {
        return {
          statusCode: 200, headers,
          body: JSON.stringify({ ok: true, recordId: existing.recordId, fields, idempotent: true }),
        };
      }

      const record = await larkCreate(token, buildLarkRecord(fields));
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ ok: true, recordId: record.record_id, fields }),
      };
    }

    // ─── UPDATE ─────────────────────────────────────────────
    if (action === "update") {
      const orderId = body.order_id || (body.fields || {}).order_id;
      if (!orderId) throw new Error("order_id mancante");
      const existing = await larkFindByOrderId(token, orderId);
      if (!existing) throw new Error("Order not found in Lark: " + orderId);

      // Merge campi vecchi + nuovi e rrebuild
      const merged = { ...existing.fields, ...(body.fields || {}) };
      await larkUpdate(token, existing.recordId, buildLarkRecord(merged));
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ ok: true, recordId: existing.recordId, fields: merged }),
      };
    }

    // ─── LIST ───────────────────────────────────────────────
    if (action === "list") {
      const items = await larkSearch(token, body.filter || {}, body.pageSize || 50);
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ ok: true, items, total: items.length }),
      };
    }

    // ─── DELETE (soft → status=cancelled) ───────────────────
    if (action === "delete") {
      const orderId = body.order_id;
      if (!orderId) throw new Error("order_id mancante");
      const existing = await larkFindByOrderId(token, orderId);
      if (!existing) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, already: "absent" }) };
      }
      const merged = { ...existing.fields, status: "cancelled" };
      await larkUpdate(token, existing.recordId, buildLarkRecord(merged));
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ ok: true, recordId: existing.recordId, fields: merged }),
      };
    }

    throw new Error("Action non riconosciuta: " + action);

  } catch (e) {
    console.error("[lark-orders]", e.message);
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};
