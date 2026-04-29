// netlify/functions/gcal-prenotazioni.js
// ════════════════════════════════════════════════════════════════════
// Tierra OS v9.2.1 — Google Calendar CRUD via Service Account JWT (FIX timezone)
// ════════════════════════════════════════════════════════════════════
// Endpoint: POST /.netlify/functions/gcal-prenotazioni
// Actions: create | update | delete | list
//
// IMPORTANTE: Richiede env vars su Netlify:
//   - GCAL_CALENDAR_ID            (es. xxx@group.calendar.google.com)
//   - GCAL_SERVICE_ACCOUNT_KEY    (JSON completo del service account)
//
// Body esempio:
//   { "action": "create", "prenotazione": { cliente, data, ora, pax, telefono, note, ... } }
//   { "action": "update", "eventId": "abc123", "prenotazione": {...} }
//   { "action": "delete", "eventId": "abc123" }
//   { "action": "list", "params": { timeMin, maxResults } }
//
// Response: { ok: true, eventId, event } | { ok: false, error }
// ════════════════════════════════════════════════════════════════════

const crypto = require("crypto");

const CALENDAR_ID = process.env.GCAL_CALENDAR_ID;
const SA_KEY_RAW  = process.env.GCAL_SERVICE_ACCOUNT_KEY;

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

// ─── Parse Service Account key (JSON string da env var) ──────────────────────
function parseServiceAccount() {
  if (!SA_KEY_RAW) {
    throw new Error("GCAL_SERVICE_ACCOUNT_KEY mancante");
  }
  try {
    const sa = typeof SA_KEY_RAW === 'string' ? JSON.parse(SA_KEY_RAW) : SA_KEY_RAW;
    if (!sa.client_email || !sa.private_key) {
      throw new Error("Service Account key incompleta (mancano client_email o private_key)");
    }
    // Normalizza newlines nella private key (Netlify a volte li escapa)
    sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    return sa;
  } catch (e) {
    throw new Error("GCAL_SERVICE_ACCOUNT_KEY non è JSON valido: " + e.message);
  }
}

// ─── base64url encoding ──────────────────────────────────────────────────────
function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// ─── JWT generator (RS256 firma con private key del SA) ──────────────────────
function generateJWT(sa) {
  const now    = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim  = {
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const claimB64  = base64url(JSON.stringify(claim));
  const signInput = headerB64 + "." + claimB64;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signInput);
  signer.end();
  const signature = signer.sign(sa.private_key);
  const sigB64    = base64url(signature);

  return signInput + "." + sigB64;
}

// ─── Access Token (cache 1h) ─────────────────────────────────────────────────
let _tokenCache = { token: null, exp: 0 };

async function getAccessToken() {
  if (_tokenCache.token && Date.now() < _tokenCache.exp) {
    return _tokenCache.token;
  }

  const sa  = parseServiceAccount();
  const jwt = generateJWT(sa);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }).toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error("OAuth token failed: " + (data.error_description || data.error || JSON.stringify(data)));
  }

  _tokenCache.token = data.access_token;
  _tokenCache.exp   = Date.now() + (data.expires_in - 60) * 1000;
  return _tokenCache.token;
}

// ─── Conversione prenotazione → evento Google Calendar ───────────────────────
function prenoToGcalEvent(p) {
  if (!p.data || !p.ora) {
    throw new Error("Prenotazione: data e ora obbligatorie");
  }

  // ─── Validazione formato data/ora ──────────────────────────────────────────
  // data: "YYYY-MM-DD"  ora: "HH:MM" (con o senza :SS)
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.data);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(p.ora);
  if (!dateMatch) throw new Error("Prenotazione: data non valida (" + p.data + ")");
  if (!timeMatch) throw new Error("Prenotazione: ora non valida (" + p.ora + ")");

  const [, Y, M, D] = dateMatch;
  const [, hh, mm, ss = "00"] = timeMatch;

  // ─── Calcolo end con offset durata ─────────────────────────────────────────
  // IMPORTANTE: Google Calendar accetta dateTime nel formato "YYYY-MM-DDTHH:MM:SS"
  // SENZA suffisso Z/offset, e usa il campo timeZone per interpretare l'orario.
  // Questo evita problemi di doppia conversione UTC↔Roma.
  const durationMin = Number(p.duration_minutes) || 120;

  // Convertiamo in minuti totali per calcolare l'ora di fine
  const startTotalMin = parseInt(hh) * 60 + parseInt(mm);
  const endTotalMin   = startTotalMin + durationMin;

  // Calcolo data/ora di fine — semplice se non si attraversa la mezzanotte
  let endY = Y, endM = M, endD = D;
  let endHh = Math.floor(endTotalMin / 60);
  const endMm = endTotalMin % 60;

  // Se l'evento sfora la mezzanotte, avanziamo di un giorno
  if (endHh >= 24) {
    endHh = endHh - 24;
    const nextDay = new Date(Date.UTC(parseInt(Y), parseInt(M) - 1, parseInt(D) + 1));
    endY = String(nextDay.getUTCFullYear());
    endM = String(nextDay.getUTCMonth() + 1).padStart(2, "0");
    endD = String(nextDay.getUTCDate()).padStart(2, "0");
  }

  const pad = (n) => String(n).padStart(2, "0");
  const startDateTime = `${Y}-${M}-${D}T${pad(hh)}:${pad(mm)}:${ss}`;
  const endDateTime   = `${endY}-${endM}-${endD}T${pad(endHh)}:${pad(endMm)}:${ss}`;

  // ─── Build description con tutti i dati prenotazione ───────────────────────
  const descParts = [];
  if (p.pax)      descParts.push("👥 PAX: " + p.pax);
  if (p.tavolo)   descParts.push("🍽️ Tavolo: " + p.tavolo);
  if (p.telefono) descParts.push("📞 Telefono: " + p.telefono);
  if (p.email)    descParts.push("✉️ Email: " + p.email);
  if (p.note)     descParts.push("\n📝 Note:\n" + p.note);
  if (p.booking_id) descParts.push("\n[booking_id: " + p.booking_id + "]");

  const summary = "🍽️ " + (p.cliente || "Prenotazione") + " (" + (p.pax || 1) + " pax)";

  return {
    summary,
    description: descParts.join("\n"),
    // dateTime senza Z/offset + timeZone esplicito = Google interpreta come ora locale Roma
    start: { dateTime: startDateTime, timeZone: "Europe/Rome" },
    end:   { dateTime: endDateTime,   timeZone: "Europe/Rome" },
    // Color ID 10 = green (confermata), 5 = giallo (in_attesa), 11 = rosso (annullata)
    colorId: p.status === "annullata" ? "11" : p.status === "in_attesa" ? "5" : "10",
    extendedProperties: {
      private: {
        booking_id: p.booking_id || "",
        source:     "tierra_os",
        cliente:    p.cliente || "",
        pax:        String(p.pax || 1),
        tavolo:     p.tavolo || "",
        status:     p.status || "confermata",
      },
    },
  };
}

// ─── Handler principale ──────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type":                 "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    if (!CALENDAR_ID) throw new Error("GCAL_CALENDAR_ID mancante");
    if (!SA_KEY_RAW)  throw new Error("GCAL_SERVICE_ACCOUNT_KEY mancante");

    const token   = await getAccessToken();
    const calId   = encodeURIComponent(CALENDAR_ID);
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`;
    const body    = parseBody(event.body);
    const action  = body.action || (event.httpMethod === "GET" ? "list" : "create");

    const authHeaders = {
      Authorization:  "Bearer " + token,
      "Content-Type": "application/json",
    };

    // ─── CREATE ─────────────────────────────────────────────────────
    if (action === "create") {
      if (!body.prenotazione) throw new Error("prenotazione mancante");
      const gcalEvent = prenoToGcalEvent(body.prenotazione);

      const res = await fetch(baseUrl, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(gcalEvent),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error("GCal create failed: " + (data.error?.message || JSON.stringify(data)));
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok:      true,
          eventId: data.id,
          htmlLink: data.htmlLink,
          event:   data,
        }),
      };
    }

    // ─── UPDATE ─────────────────────────────────────────────────────
    if (action === "update") {
      if (!body.eventId)      throw new Error("eventId mancante");
      if (!body.prenotazione) throw new Error("prenotazione mancante");

      const gcalEvent = prenoToGcalEvent(body.prenotazione);

      const res = await fetch(`${baseUrl}/${encodeURIComponent(body.eventId)}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(gcalEvent),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error("GCal update failed: " + (data.error?.message || JSON.stringify(data)));
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok:      true,
          eventId: data.id,
          htmlLink: data.htmlLink,
          event:   data,
        }),
      };
    }

    // ─── DELETE ─────────────────────────────────────────────────────
    if (action === "delete") {
      if (!body.eventId) throw new Error("eventId mancante");

      const res = await fetch(`${baseUrl}/${encodeURIComponent(body.eventId)}`, {
        method:  "DELETE",
        headers: authHeaders,
      });

      // 204 No Content = OK; 410 Gone = già cancellato (OK); 404 = non trovato (OK)
      if (!res.ok && res.status !== 410 && res.status !== 404) {
        let errMsg = "GCal delete failed: HTTP " + res.status;
        try {
          const errData = await res.json();
          errMsg += " — " + (errData.error?.message || JSON.stringify(errData));
        } catch (e) {}
        throw new Error(errMsg);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true }),
      };
    }

    // ─── LIST ───────────────────────────────────────────────────────
    if (action === "list") {
      const params      = body.params || {};
      const timeMin     = params.timeMin     || new Date().toISOString();
      const maxResults  = Math.min(params.maxResults || 50, 250);
      const singleEvents = params.singleEvents !== false;

      const qs = new URLSearchParams({
        timeMin,
        maxResults:   String(maxResults),
        singleEvents: String(singleEvents),
        orderBy:      "startTime",
      });
      if (params.timeMax) qs.append("timeMax", params.timeMax);
      if (params.q)       qs.append("q",       params.q);

      const res = await fetch(`${baseUrl}?${qs}`, {
        method:  "GET",
        headers: authHeaders,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error("GCal list failed: " + (data.error?.message || JSON.stringify(data)));
      }

      const items = (data.items || []).map(ev => ({
        eventId:     ev.id,
        summary:     ev.summary,
        description: ev.description,
        start:       ev.start?.dateTime || ev.start?.date,
        end:         ev.end?.dateTime   || ev.end?.date,
        booking_id:  ev.extendedProperties?.private?.booking_id || "",
        cliente:     ev.extendedProperties?.private?.cliente    || "",
        pax:         Number(ev.extendedProperties?.private?.pax) || 0,
        tavolo:      ev.extendedProperties?.private?.tavolo     || "",
        status:      ev.extendedProperties?.private?.status     || "",
        htmlLink:    ev.htmlLink,
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok:    true,
          items,
          total: items.length,
        }),
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
