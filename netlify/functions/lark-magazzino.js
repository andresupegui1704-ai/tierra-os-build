// netlify/functions/lark-magazzino.js
// SLOT 2 — CRUD Magazzino (articoli, giacenza, foto, categorie)
// GET    /lark-magazzino          → tutti gli articoli
// GET    /lark-magazzino?id=XXX   → singolo articolo
// POST   /lark-magazzino          → crea articolo
// PUT    /lark-magazzino?id=XXX   → aggiorna
// DELETE /lark-magazzino?id=XXX   → elimina
// POST   /lark-magazzino?action=decrement  → decrementa stock (chiamato da ordini)
// POST   /lark-magazzino?action=upload-photo → upload foto articolo

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';
const TABLE_NAME = 'Magazzino';

// ═══════════════════════════════════════════════════════════════
// AUTH & HELPERS
// ═══════════════════════════════════════════════════════════════
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${LARK_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.tenant_access_token) throw new Error('Lark auth failed');

  cachedToken = data.tenant_access_token;
  tokenExpiry = Date.now() + (data.expire - 60) * 1000; // 1 min buffer
  return cachedToken;
}

async function findTableId(token, tableName = TABLE_NAME) {
  const baseToken = process.env.LARK_BASE_TOKEN;
  const res = await fetch(
    `${LARK_BASE_URL}/bitable/v1/apps/${baseToken}/tables?page_size=100`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await res.json();
  const table = data.data?.items?.find(t => t.name === tableName);
  if (!table) throw new Error(`Tabella "${tableName}" non trovata`);
  return table.table_id;
}

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════
async function listRecords(token, tableId, filters = {}) {
  const baseToken = process.env.LARK_BASE_TOKEN;
  let url = `${LARK_BASE_URL}/bitable/v1/apps/${baseToken}/tables/${tableId}/records?page_size=500`;

  // Filtri opzionali
  if (filters.categoria) {
    url += `&filter=CurrentValue.[Categoria]="${encodeURIComponent(filters.categoria)}"`;
  }

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();

  if (data.code !== 0) throw new Error(`List failed: ${JSON.stringify(data)}`);

  // Trasforma in formato più "amichevole"
  return (data.data?.items || []).map(r => ({
    id: r.record_id,
    ...r.fields,
    _raw: r,
  }));
}

async function getRecord(token, tableId, recordId) {
  const baseToken = process.env.LARK_BASE_TOKEN;
  const res = await fetch(
    `${LARK_BASE_URL}/bitable/v1/apps/${baseToken}/tables/${tableId}/records/${recordId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Get failed: ${JSON.stringify(data)}`);
  return { id: data.data.record.record_id, ...data.data.record.fields };
}

async function createRecord(token, tableId, fields) {
  const baseToken = process.env.LARK_BASE_TOKEN;
  const res = await fetch(
    `${LARK_BASE_URL}/bitable/v1/apps/${baseToken}/tables/${tableId}/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Create failed: ${JSON.stringify(data)}`);
  return { id: data.data.record.record_id, ...data.data.record.fields };
}

async function updateRecord(token, tableId, recordId, fields) {
  const baseToken = process.env.LARK_BASE_TOKEN;
  const res = await fetch(
    `${LARK_BASE_URL}/bitable/v1/apps/${baseToken}/tables/${tableId}/records/${recordId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Update failed: ${JSON.stringify(data)}`);
  return { id: data.data.record.record_id, ...data.data.record.fields };
}

async function deleteRecord(token, tableId, recordId) {
  const baseToken = process.env.LARK_BASE_TOKEN;
  const res = await fetch(
    `${LARK_BASE_URL}/bitable/v1/apps/${baseToken}/tables/${tableId}/records/${recordId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error(`Delete failed: ${JSON.stringify(data)}`);
  return { deleted: true, id: recordId };
}

// ═══════════════════════════════════════════════════════════════
// DECREMENTO STOCK — chiamato da ordini confermati
// ═══════════════════════════════════════════════════════════════
async function decrementStock(token, tableId, items) {
  // items = [{ id: 'recXXX', quantity: 2 }, ...]
  const results = [];
  const alerts = []; // Articoli sotto soglia o terminati

  for (const item of items) {
    const record = await getRecord(token, tableId, item.id);
    const currentStock = record.Giacenza || 0;
    const newStock = Math.max(0, currentStock - item.quantity);
    const soglia = record['Soglia Minima'] || 0;

    const updated = await updateRecord(token, tableId, item.id, {
      'Giacenza': newStock,
      // Se stock = 0, imposta automaticamente "Disponibile" = false
      ...(newStock === 0 ? { 'Disponibile': false } : {}),
    });

    results.push({
      id: item.id,
      articolo: record.Articolo,
      before: currentStock,
      after: newStock,
      decremented: item.quantity,
    });

    // Genera alert se sotto soglia o terminato
    if (newStock === 0) {
      alerts.push({ articolo: record.Articolo, level: 'OUT_OF_STOCK', stock: 0 });
    } else if (newStock <= soglia && soglia > 0) {
      alerts.push({ articolo: record.Articolo, level: 'LOW_STOCK', stock: newStock, soglia });
    }
  }

  return { results, alerts };
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD FOTO — Carica immagine su Lark Drive e allega a record
// ═══════════════════════════════════════════════════════════════
async function uploadPhoto(token, recordId, photoBase64, filename = 'foto.jpg') {
  // 1. Upload su Lark Drive
  const baseToken = process.env.LARK_BASE_TOKEN;
  const tableId = await findTableId(token);

  // Converti base64 in Buffer
  const buffer = Buffer.from(photoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const size = buffer.length;

  // Lark richiede form-data multipart
  const boundary = '----TierraFormBoundary' + Date.now();
  const parent_type = 'bitable_image';
  const parent_node = baseToken;

  const formParts = [];
  // file_name
  formParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file_name"\r\n\r\n${filename}`);
  // parent_type
  formParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="parent_type"\r\n\r\n${parent_type}`);
  // parent_node
  formParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="parent_node"\r\n\r\n${parent_node}`);
  // size
  formParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\n${size}`);
  // file
  formParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`);

  const textPart = formParts.join('\r\n') + '\r\n';
  const endPart = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(textPart, 'utf8'),
    buffer,
    Buffer.from(endPart, 'utf8'),
  ]);

  const uploadRes = await fetch(`${LARK_BASE_URL}/drive/v1/medias/upload_all`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  const uploadData = await uploadRes.json();
  if (uploadData.code !== 0) {
    throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
  }

  const fileToken = uploadData.data.file_token;

  // 2. Allega al record
  if (recordId) {
    await updateRecord(token, tableId, recordId, {
      'Foto': [{ file_token: fileToken }],
    });
  }

  return { file_token: fileToken };
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const token = await getAccessToken();
    const tableId = await findTableId(token);
    const params = event.queryStringParameters || {};
    const method = event.httpMethod;

    // Azioni speciali
    if (method === 'POST' && params.action === 'decrement') {
      const { items } = JSON.parse(event.body);
      const result = await decrementStock(token, tableId, items);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...result }) };
    }

    if (method === 'POST' && params.action === 'upload-photo') {
      const { record_id, photo_base64, filename } = JSON.parse(event.body);
      const result = await uploadPhoto(token, record_id, photo_base64, filename);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...result }) };
    }

    // CRUD standard
    switch (method) {
      case 'GET': {
        if (params.id) {
          const record = await getRecord(token, tableId, params.id);
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, record }) };
        }
        const records = await listRecords(token, tableId, {
          categoria: params.categoria,
        });
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, records, count: records.length }) };
      }

      case 'POST': {
        const fields = JSON.parse(event.body);
        const record = await createRecord(token, tableId, fields);
        return { statusCode: 201, headers, body: JSON.stringify({ ok: true, record }) };
      }

      case 'PUT': {
        if (!params.id) throw new Error('Missing id parameter');
        const fields = JSON.parse(event.body);
        const record = await updateRecord(token, tableId, params.id, fields);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, record }) };
      }

      case 'DELETE': {
        if (!params.id) throw new Error('Missing id parameter');
        const result = await deleteRecord(token, tableId, params.id);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, ...result }) };
      }

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
