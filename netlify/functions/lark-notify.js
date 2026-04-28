// ════════════════════════════════════════════════════════════════════════════
// 📨 lark-notify.js — Invia messaggi alla chat Lark staff
// ════════════════════════════════════════════════════════════════════════════
//
// Segreti letti da env var Netlify: LARK_APP_ID, LARK_APP_SECRET, LARK_CHAT_ID
// Origin CORS configurabile via ALLOWED_ORIGIN (default: tierra-os.netlify.app)
//
// ACCETTA:
//   { card: {...} }   — card Lark interactive
//   { text: "..." }   — messaggio testuale semplice
// ════════════════════════════════════════════════════════════════════════════

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://tierra-os.netlify.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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
  if (!data.app_access_token) throw new Error("Lark auth: " + JSON.stringify(data));
  tokenCache = {
    value: data.app_access_token,
    expiresAt: Date.now() + ((data.expire || 7200) * 1000),
  };
  return tokenCache.value;
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

  const chatId = process.env.LARK_CHAT_ID;
  if (!chatId) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "LARK_CHAT_ID not configured" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  let msgType, content;
  if (body.card) {
    msgType = "interactive";
    content = JSON.stringify(body.card);
  } else if (typeof body.text === "string") {
    msgType = "text";
    content = JSON.stringify({ text: body.text });
  } else {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Body must have 'card' or 'text'" }),
    };
  }

  try {
    const token = await getLarkToken();
    const res = await fetch(
      `https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receive_id: chatId,
          msg_type: msgType,
          content,
        }),
      }
    );
    const data = await res.json();
    if (data.code !== 0) {
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Lark send failed", detail: data.msg }),
      };
    }
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, message_id: data.data?.message_id }),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Upstream error", detail: e.message }),
    };
  }
};
