// ════════════════════════════════════════════════════════════════════════════
// 🤖 claude-proxy.js — Proxy per Anthropic API
// ════════════════════════════════════════════════════════════════════════════
//
// PERCHÉ:
// Il v11 aveva callClaude() che chiamava api.anthropic.com direttamente.
// Quella chiamata NON funzionava (mancava l'header x-api-key).
// Ora: chiave API vive solo come env var Netlify ANTHROPIC_API_KEY.
//
// MODELLO: Haiku 4.5 (claude-haiku-4-5-20251001)
//   - 5x più economico di Sonnet ($1/$5 vs $3/$15 per milione di token)
//   - Più veloce (1-2 sec vs 3-5 sec)
//   - Perfetto per i task Tierra: parsing ordini vocali, generazione
//     menu breve, estrazione dati fatture
//
// ACCETTA:
//   { prompt: "..." }                                    — solo testo
//   { prompt: "...", imageBase64: "...", mediaType: "image/jpeg" }  — con immagine
//
// RISPONDE:
//   { text: "..." }   — il testo generato da Claude
// ════════════════════════════════════════════════════════════════════════════

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://tierra-os.netlify.app";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS || "1024");

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
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

  const { prompt, imageBase64, mediaType } = payload;
  if (!prompt || typeof prompt !== "string") {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Missing or invalid 'prompt'" }),
    };
  }

  // Costruzione messages: testo-solo oppure testo+immagine (Vision)
  let userContent;
  if (imageBase64) {
    userContent = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType || "image/jpeg",
          data: imageBase64,
        },
      },
      { type: "text", text: prompt },
    ];
  } else {
    userContent = prompt;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Anthropic API error",
          detail: data?.error?.message || data?.error || "Unknown",
        }),
      };
    }

    const text = data?.content?.[0]?.text || "";
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model: data.model,
        usage: data.usage, // input_tokens, output_tokens — utile per monitoraggio costi
      }),
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Network error", detail: e.message }),
    };
  }
};
