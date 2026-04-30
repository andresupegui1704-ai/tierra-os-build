/**
 * TIERRA OS v9.4
 * print-cassa.js — Netlify Function
 * 
 * Genera bytes ESC/POS per ricevuta CASSA (pagamento ordine)
 * Invia alla stampante Sunmi NT311 (192.168.1.100:9100)
 * 
 * Format:
 *  - 48 chars width
 *  - CP858 encoding (€ symbol)
 *  - Header: TIERRA ORGANIC BISTROT
 *  - Body: items + totale
 *  - Footer: data, ID ordine, taglia
 * 
 * NOTA: in produzione, la stampa diretta su 192.168.1.100:9100 richiede
 * un proxy locale (es. raspberry o backend in rete locale Tierra) perché
 * Netlify Functions non possono raggiungere IP privati LAN.
 * 
 * Strategia v9.4:
 *  - Risposta 200 con bytes ESC/POS (base64) + URL print
 *  - Frontend (PWA) invia direttamente alla stampante via fetch interno
 *    se in rete LAN, altrimenti usa ESC/POS HTML preview.
 */

const TIERRA_SITE_TOKEN = process.env.TIERRA_SITE_TOKEN || 'tierra2024';

// ============================================================================
// ESC/POS COMMAND CODES
// ============================================================================

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_ON: [GS, 0x21, 0x11], // double width + height
  DOUBLE_OFF: [GS, 0x21, 0x00],
  CUT: [GS, 0x56, 0x42, 0x00], // partial cut
  CHARSET_CP858: [ESC, 0x74, 0x13], // CP858 (€ symbol)
  FEED_LINES: (n) => [ESC, 0x64, n],
};

const WIDTH = 48;

// ============================================================================
// HELPERS
// ============================================================================

function encodeText(text) {
  // Codifica CP858-friendly (€, accenti)
  // Per semplicità: latin1 (CP858 compatible per chars base)
  const buf = Buffer.from(text, 'latin1');
  return Array.from(buf);
}

function lineFull(char = '-') {
  return char.repeat(WIDTH);
}

function lineSplit(left, right) {
  const padding = WIDTH - left.length - right.length;
  if (padding < 1) {
    return left.slice(0, WIDTH - right.length - 1) + ' ' + right;
  }
  return left + ' '.repeat(padding) + right;
}

function center(text) {
  const pad = Math.floor((WIDTH - text.length) / 2);
  return ' '.repeat(Math.max(0, pad)) + text;
}

// ============================================================================
// BUILD CASSA BYTES
// ============================================================================

function buildCassaBytes(order) {
  const bytes = [];

  // Init
  bytes.push(...CMD.INIT);
  bytes.push(...CMD.CHARSET_CP858);

  // Header centered
  bytes.push(...CMD.ALIGN_CENTER);
  bytes.push(...CMD.DOUBLE_ON);
  bytes.push(...CMD.BOLD_ON);
  bytes.push(...encodeText('TIERRA'));
  bytes.push(LF);
  bytes.push(...CMD.DOUBLE_OFF);
  bytes.push(...encodeText('Organic Bistrot'));
  bytes.push(LF);
  bytes.push(...CMD.BOLD_OFF);
  bytes.push(...encodeText('Via Tirso 34, Roma'));
  bytes.push(LF);
  bytes.push(LF);

  // Separator
  bytes.push(...CMD.ALIGN_LEFT);
  bytes.push(...encodeText(lineFull('=')));
  bytes.push(LF);

  // Title
  bytes.push(...CMD.ALIGN_CENTER);
  bytes.push(...CMD.BOLD_ON);
  bytes.push(...encodeText('RICEVUTA CASSA'));
  bytes.push(LF);
  bytes.push(...CMD.BOLD_OFF);

  // Order info
  bytes.push(...CMD.ALIGN_LEFT);
  bytes.push(...encodeText(lineFull('-')));
  bytes.push(LF);
  bytes.push(...encodeText(`Ordine: ${order.order_id || 'N/A'}`));
  bytes.push(LF);
  bytes.push(...encodeText(`Tavolo: ${order.table_code || 'N/A'}`));
  bytes.push(LF);

  const date = order.created_at
    ? new Date(order.created_at).toLocaleString('it-IT')
    : new Date().toLocaleString('it-IT');
  bytes.push(...encodeText(`Data:   ${date}`));
  bytes.push(LF);
  bytes.push(...encodeText(lineFull('-')));
  bytes.push(LF);

  // Items
  const items = typeof order.items === 'string'
    ? JSON.parse(order.items)
    : (order.items || []);

  items.forEach((item) => {
    const left = `${item.qty}x ${item.nome}`;
    const right = `EUR ${(item.prezzo * item.qty).toFixed(2)}`;
    bytes.push(...encodeText(lineSplit(left, right)));
    bytes.push(LF);
  });

  bytes.push(...encodeText(lineFull('-')));
  bytes.push(LF);

  // Total
  bytes.push(...CMD.BOLD_ON);
  bytes.push(...CMD.DOUBLE_ON);
  const totalAmount = Number(order.total_amount || 0).toFixed(2);
  bytes.push(...encodeText(lineSplit('TOTALE', `EUR ${totalAmount}`)));
  bytes.push(LF);
  bytes.push(...CMD.DOUBLE_OFF);
  bytes.push(...CMD.BOLD_OFF);

  // Notes
  if (order.notes) {
    bytes.push(LF);
    bytes.push(...encodeText(`Note: ${order.notes}`));
    bytes.push(LF);
  }

  // Footer
  bytes.push(LF);
  bytes.push(...CMD.ALIGN_CENTER);
  bytes.push(...encodeText('Grazie per la visita'));
  bytes.push(LF);
  bytes.push(...encodeText('www.tierraorganic.it'));
  bytes.push(LF);

  // Feed + Cut
  bytes.push(...CMD.FEED_LINES(4));
  bytes.push(...CMD.CUT);

  return Buffer.from(bytes);
}

// ============================================================================
// HANDLER
// ============================================================================

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tierra-Token',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // Auth
  const token = event.headers['x-tierra-token'];
  if (token !== TIERRA_SITE_TOKEN) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const order = body.order;

    if (!order) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing order' }),
      };
    }

    const escposBuffer = buildCassaBytes(order);
    const base64 = escposBuffer.toString('base64');

    console.log('[PRINT_CASSA]', order.order_id, '→', escposBuffer.length, 'bytes');

    // Risposta: bytes ESC/POS in base64
    // Frontend PWA li riceve e li invia a 192.168.1.100:9100 via fetch LAN
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order_id: order.order_id,
        bytes_length: escposBuffer.length,
        escpos_base64: base64,
        printer_url: 'http://192.168.1.100:9100',
        message: 'ESC/POS bytes generated. Frontend deve inviare a 192.168.1.100:9100',
      }),
    };
  } catch (err) {
    console.error('[PRINT_CASSA_ERROR]', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
