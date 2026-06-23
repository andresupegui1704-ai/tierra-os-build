// ════════════════════════════════════════════════════════════════════════════
// 🗄️ lark-base.js — Lettura/scrittura Lark Base (tabelle e record)
// ════════════════════════════════════════════════════════════════════════════
//
// Segreti letti da env var Netlify: LARK_APP_ID, LARK_APP_SECRET, LARK_BASE_TOKEN
//
// ACTIONS SUPPORTATE:
//   - "list_tables"     → elenca tabelle del Base
//   - "add_record"      → inserisce record (accetta tableName O tableId)
//   - "setup_tables"    → crea le 4 tabelle Tierra se non esistono (Chiusure
//                         Cassa, Ordini Fornitori, Task, Vendite)
//   - "create_table"    → crea una nuova tabella custom
// ════════════════════════════════════════════════════════════════════════════

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://tierra-os.netlify.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Cache token in memoria (dura per invocazioni consecutive sulla stessa istanza)
let tokenCache = { value: null, expiresAt: 0 };

async function getLarkToken() {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.value;
  }
  const res = await fetch("https://open.larksuite.com/open-apis/auth/v3/app_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.app_access_token) throw new Error("Lark auth failed: " + JSON.stringify(data));
  tokenCache = {
    value: data.app_access_token,
    expiresAt: Date.now() + ((data.expire || 7200) * 1000),
  };
  return tokenCache.value;
}

// Cache IDs tabelle
let tableIdsCache = null;
async function listAllTables(token, baseToken) {
  if (tableIdsCache) return tableIdsCache;
  const res = await fetch(
    `https://open.larksuite.com/open-apis/bitable/v1/apps/${baseToken}/tables?page_size=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  const ids = {};
  (data?.data?.items || []).forEach(t => { ids[t.name] = t.table_id; });
  tableIdsCache = ids;
  return ids;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const baseToken = process.env.LARK_BASE_TOKEN || process.env.LARK_BASE_ID;
  if (!baseToken) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "LARK_BASE_TOKEN not configured" }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { action } = payload;
  if (!action) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Missing 'action'" }),
    };
  }

  try {
    const token = await getLarkToken();
    const baseUrl = `https://open.larksuite.com/open-apis/bitable/v1/apps/${baseToken}`;
    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // ─── list_tables ──────────────────────────────────────────────
    if (action === "list_tables") {
      const upstream = await fetch(`${baseUrl}/tables?page_size=50`, { headers: authHeaders });
      const data = await upstream.json();
      return {
        statusCode: upstream.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      };
    }

    // ─── add_record (accetta tableName O tableId) ────────────────
    if (action === "add_record") {
      let tableId = payload.tableId;
      if (!tableId && payload.tableName) {
        const ids = await listAllTables(token, baseToken);
        tableId = ids[payload.tableName];
      }
      if (!tableId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Missing tableId or tableName (or table not found)" }),
        };
      }
      if (!payload.fields) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Missing 'fields'" }),
        };
      }
      const upstream = await fetch(`${baseUrl}/tables/${tableId}/records`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ fields: payload.fields }),
      });
      const data = await upstream.json();
      return {
        statusCode: upstream.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      };
    }

    // ─── setup_tables (crea le 4 tabelle Tierra) ─────────────────
    if (action === "setup_tables") {
      const schemas = {
        "Chiusure Cassa":   [["Data","1"],["Cash","2"],["POS","2"],["Stripe","2"],["TOT DAY","2"],["Scostamento","2"],["Operatore","1"],["Note","1"]],
        "Ordini Fornitori": [["Data","1"],["Fornitore","1"],["Prodotti","1"],["Totale","2"],["Operatore","1"],["Origine","1"]],
        "Task":             [["Data","1"],["Titolo","1"],["Ruolo","1"],["Operatore","1"],["Inizio","1"],["Fine","1"],["Stato","1"]],
        "Vendite":          [["Data","1"],["Servizio","1"],["Importo","2"],["Coperti","2"],["Note","1"]],
      };
      const existing = await listAllTables(token, baseToken);
      const created = [];
      const skipped = [];
      for (const [name, fields] of Object.entries(schemas)) {
        if (existing[name]) { skipped.push(name); continue; }
        const body = {
          table: {
            name,
            default_view_name: "Griglia",
            fields: fields.map(([field_name, field_type]) => ({
              field_name,
              field_type: parseInt(field_type),
            })),
          },
        };
        const r = await fetch(`${baseUrl}/tables`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(body),
        });
        if (r.ok) created.push(name); else skipped.push(name + " (error)");
      }
      tableIdsCache = null; // invalida cache
      return {
        statusCode: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, created, skipped }),
      };
    }

    // ─── create_table (custom) ────────────────────────────────────
    if (action === "create_table") {
      if (!payload.table) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Missing 'table'" }),
        };
      }
      const upstream = await fetch(`${baseUrl}/tables`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ table: payload.table }),
      });
      const data = await upstream.json();
      tableIdsCache = null;
      return {
        statusCode: upstream.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Unknown action: " + action }),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Upstream error", detail: e.message }),
    };
  }
};
