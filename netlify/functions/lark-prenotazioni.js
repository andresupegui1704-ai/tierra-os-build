// netlify/functions/lark-prenotazioni.js
// ════════════════════════════════════════════════════════════════════
// Tierra OS v9.2 — Lark Base CRUD Prenotazioni (FIX field mapping)
// ════════════════════════════════════════════════════════════════════
// Endpoint: POST /.netlify/functions/lark-prenotazioni
// Actions: create | update | delete | list
//
// IMPORTANTE: La tabella Prenotazioni in Lark Base ha solo `booking_id`
// come campo accessibile via API. Tutti i dati prenotazione vengono
// serializzati in JSON e salvati come stringa in `booking_id`.
//
// Body esempio:
//   { "action": "create", "fields": { cliente, data, ora, pax, ... } }
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
  _tokenCache.exp   = Date.now() + (data.expire - 60) * 1000;
  return _tokenCache.token;
}

// ─── Body parser robusto ─────────────────────────────────────────────────────
function parseBody(eventBody) {
  if (!eventBody) return {};
  if (typeof eventBody === 'object') return eventBody;
  try {
    return JSON.parse(eventBody);
  } catch (e) {
    throw new Error("Invalid JSON body: " + e.message);
  }
}

// ─── Serializza i fields in un singolo JSON string per booking_id ────────────
function serializeFields(input) {
  const clean = {};
  for (const [k, v] of Object.entries(input || {})) {
    if (v === undefined || v === null || v === "") continue;
    clean[k] = v;
  }
  return JSON.stringify(clean);
}

// ─── Deserializza il booking_id JSON in oggetto fields ───────────────────────
function deserializeFields(bookingIdValue) {
  if (!bookingIdValue) return {};
  if (typeof bookingIdValue !== 'string') return { raw: bookingIdValue };
  try {
    return JSON.parse(bookingIdValue);
  } catch (e) {
    // Se non è JSON valido, lo restituisce come campo "value"
    return { value: bookingIdValue };
  }
}

// ─── Estrazione testo da campi multi-tipo Lark ──────────────────────────────
function extractText(field) {
  if (typeof field === 'string') return field;
  if (Array.isArray(field) && field.length > 0) {
    return field.map(item => item.text || item.value || '').join('');
  }
  if (field && typeof field === 'object') {
    return field.text || field.value || JSON.stringify(field);
  }
  return String(field || '');
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
    const body = parseBody(event.body);
    const action = body.action || (event.httpMethod === "GET" ? "list" : "create");

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    };

    // ─── CREATE ─────────────────────────────────────────────────────
    if (action === "create") {
      const inputFields = body.fields || {};
      
      // Aggiungi metadata automatici
      if (!inputFields.created_at) {
        inputFields.created_at = new Date().toISOString();
      }
      if (!inputFields.status) {
        inputFields.status = "confermata";
      }
      
      // Serializza tutti i fields nel campo booking_id
      const booking_id = serializeFields(inputFields);
      
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ fields: { booking_id } }),
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
          fields: inputFields,
        }),
      };
    }

    // ─── UPDATE ─────────────────────────────────────────────────────
    if (action === "update") {
      if (!body.recordId) throw new Error("recordId mancante");
      
      // Prima leggi il record esistente per fare merge
      const getRes = await fetch(`${baseUrl}/${body.recordId}`, {
        method: "GET",
        headers: authHeaders,
      });
      const getData = await getRes.json();
      
      let existingFields = {};
      if (getData.code === 0 && getData.data?.record?.fields?.booking_id) {
        existingFields = deserializeFields(extractText(getData.data.record.fields.booking_id));
      }
      
      // Merge con nuovi fields
      const mergedFields = {
        ...existingFields,
        ...(body.fields || {}),
        updated_at: new Date().toISOString(),
      };
      
      const booking_id = serializeFields(mergedFields);
      
      const res = await fetch(`${baseUrl}/${body.recordId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ fields: { booking_id } }),
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
          fields: mergedFields,
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

      // Deserializza il booking_id JSON di ogni record
      const items = (data.data?.items || []).map(r => {
        const bookingIdRaw = r.fields?.booking_id;
        const bookingIdText = extractText(bookingIdRaw);
        const deserialized = deserializeFields(bookingIdText);
        
        return {
          recordId: r.record_id,
          fields: deserialized,
          // Mantieni anche il raw per debug
          _raw: bookingIdText,
        };
      }).filter(item => {
        // Filtra i record di metadata (i 14 vecchi record con valori "cliente", "data", ecc.)
        const raw = item._raw || '';
        return raw.startsWith('{') || Object.keys(item.fields).length > 1;
      });

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
