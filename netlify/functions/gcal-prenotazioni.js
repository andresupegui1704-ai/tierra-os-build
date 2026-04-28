// netlify/functions/gcal-prenotazioni.js
// ════════════════════════════════════════════════════════════════════
// Tierra OS v9 — Google Calendar CRUD via Service Account JWT
// ════════════════════════════════════════════════════════════════════
// Endpoint: POST /.netlify/functions/gcal-prenotazioni
// Actions: create | update | delete | list
//
// Body esempio:
//   { "action": "create", "prenotazione": { cliente, data, ora, pax, ... } }
//   { "action": "update", "eventId": "abc", "prenotazione": {...} }
//   { "action": "delete", "eventId": "abc" }
//   { "action": "list", "params": { timeMin, maxResults } }
//
// Response: { ok: true, eventId, event } | { ok: false, error }
// ════════════════════════════════════════════════════════════════════

const crypto = require("crypto");

const CALENDAR_ID = process.env.GCAL_CALENDAR_ID;
const SA_KEY_RAW  = process.env.GCAL_SERVICE_ACCOUNT_KEY;

// ─── JWT generator per Service Account ──────────────────────────────────────
function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken() {
  if (!SA_KEY_RAW) throw new Error("GCAL_SERVICE_ACCOUNT_KEY mancante");

  let sa;
  try {
    sa = typeof SA_KEY_RAW === "string" ? JSON.parse(SA_KEY_RAW) : SA_KEY_RAW;
  } catch (e) {
    throw new Error("GCAL_SERVICE_ACCOUNT_KEY non è un JSON valido: " + e.message);
  }

  if (!sa.client_email || !sa.private_key) {
    throw new Error("Service account key incompleta (manca client_email o private_key)");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encHeader  = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(payload));
  const signInput  = `${encHeader}.${encPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signInput);
  signer.end();
  const signature = signer.sign(sa.private_key);
  const encSig    = base64url(signature);

  const jwt = `${signInput}.${encSig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Token GCal failed: " + err);
  }

  const data = await res.json();
  return data.access_token;
}

// ─── Build evento Google Calendar da prenotazione ───────────────────────────
function buildEvent(p) {
  if (!p || !p.cliente || !p.data || !p.ora) {
    throw new Error("Prenotazione incompleta (cliente/data/ora mancanti)");
  }

  // Durata default 90 min
  const start = new Date(`${p.data}T${p.ora}:00`);
  if (isNaN(start.getTime())) {
    throw new Error(`Data/ora non valide: ${p.data} ${p.ora}`);
  }
  const end = new Date(start.getTime() + 90 * 60 * 1000);

  return {
    summary: `🍽️ ${p.cliente} (${p.pax || 1} pax)${p.tavolo ? " — T" + p.tavolo : ""}`,
    description: [
      `Cliente: ${p.cliente}`,
      `PAX: ${p.pax || 1}`,
      p.tavolo ? `Tavolo: ${p.tavolo}` : "",
      p.telefono ? `Tel: ${p.telefono}` : "",
      p.email ? `Email: ${p.email}` : "",
      p.note ? `\nNote: ${p.note}` : "",
      `\n— Tierra OS · ID: ${p.booking_id || ""}`,
    ].filter(Boolean).join("\n"),
    start: { dateTime: start.toISOString(), timeZone: "Europe/Rome" },
    end:   { dateTime: end.toISOString(),   timeZone: "Europe/Rome" },
    location: "Tierra Organic Bistrot, Via Tirso 34, Roma",
  };
}

// ─── Handler principale ──────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    if (!CALENDAR_ID) throw new Error("GCAL_CALENDAR_ID mancante");

    const token = await getAccessToken();
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action || (event.httpMethod === "GET" ? "list" : "create");

    // ─── CREATE ─────────────────────────────────────────────────────
    if (action === "create") {
      const ev = buildEvent(body.prenotazione);
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ev),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Create failed");
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, eventId: data.id, event: data }),
      };
    }

    // ─── UPDATE ─────────────────────────────────────────────────────
    if (action === "update") {
      if (!body.eventId) throw new Error("eventId mancante");
      const ev = buildEvent(body.prenotazione);
      const res = await fetch(`${baseUrl}/${body.eventId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ev),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Update failed");
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, eventId: data.id, event: data }),
      };
    }

    // ─── DELETE ─────────────────────────────────────────────────────
    if (action === "delete") {
      if (!body.eventId) throw new Error("eventId mancante");
      const res = await fetch(`${baseUrl}/${body.eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      // 410 = già cancellato, 404 = non esiste — entrambi OK
      if (!res.ok && res.status !== 410 && res.status !== 404) {
        const err = await res.text();
        throw new Error(err);
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true }),
      };
    }

    // ─── LIST ───────────────────────────────────────────────────────
    if (action === "list") {
      const params = body.params || {};
      const qs = new URLSearchParams({
        maxResults: String(params.maxResults || 100),
        orderBy: "startTime",
        singleEvents: "true",
        timeMin: params.timeMin || new Date(Date.now() - 86400000).toISOString(),
      });
      if (params.timeMax) qs.append("timeMax", params.timeMax);

      const res = await fetch(`${baseUrl}?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "List failed");
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, items: data.items || [] }),
      };
    }

    throw new Error("Action non riconosciuta: " + action);

  } catch (e) {
    console.error("[gcal-prenotazioni]", e.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};
