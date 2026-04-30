/**
 * TIERRA OS v9.4
 * lark-orders.js - Netlify Function
 * CRUD ordini tavolo + webhook sito
 * 
 * Endpoints:
 * POST   /api/orders/create       - Crea nuovo ordine
 * GET    /api/orders/:table_code  - Ottieni ordini tavolo
 * PATCH  /api/orders/:order_id    - Aggiorna stato ordine
 * POST   /api/orders/:order_id/pay - Marca come pagato + webhook sito
 */

const https = require('https');

// ============================================================================
// LARK SDK SETUP
// ============================================================================

const LARK_APP_ID = process.env.LARK_APP_ID || 'cli_a96eb75ba5e1de17';
const LARK_APP_SECRET = process.env.LARK_APP_SECRET;
const LARK_BASE_ID = process.env.LARK_BASE_ID || 'DWpvwpxsViYlMskDFr6jrUccpug';
const LARK_ORDINI_TABLE_ID = process.env.LARK_ORDINI_TABLE_ID || 'tbllWx1VealRRlie';
const LARK_BASE_TOKEN = process.env.LARK_BASE_TOKEN;

// Sito webhook
const TIERRA_SITE_BASE_URL = process.env.TIERRA_SITE_BASE_URL || 'https://tierraorganic.it';
const TIERRA_SITE_TOKEN = process.env.TIERRA_SITE_TOKEN || 'tierra2024';
const TIERRA_SITE_SHARED_SECRET = process.env.TIERRA_SITE_SHARED_SECRET || '304effae-dc20-4a37-aa5c-a829161c3dda';

// ============================================================================
// UTILITY: HTTP REQUEST (Promise-based)
// ============================================================================

function makeRequest(method, hostname, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ============================================================================
// LARK API: Token + Record Operations
// ============================================================================

let larkToken = null;
let larkTokenExpiry = 0;

async function getLarkToken() {
  const now = Date.now();
  if (larkToken && now < larkTokenExpiry) {
    return larkToken;
  }

  try {
    const res = await makeRequest(
      'POST',
      'open.larksuite.com',
      '/open-apis/auth/v3/tenant_access_token/internal',
      {},
      { app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }
    );

    if (res.data.code === 0) {
      larkToken = res.data.tenant_access_token;
      larkTokenExpiry = now + (res.data.expire * 1000) - 60000; // 1 min buffer
      return larkToken;
    } else {
      throw new Error(`Lark auth failed: ${res.data.msg}`);
    }
  } catch (err) {
    console.error('[LARK_TOKEN]', err.message);
    throw err;
  }
}

async function larkCreateRecord(tableId, fields) {
  const token = await getLarkToken();
  const url = `/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records`;

  const res = await makeRequest(
    'POST',
    'open.larksuite.com',
    url,
    { Authorization: `Bearer ${token}` },
    { fields }
  );

  if (res.data.code === 0) {
    return res.data.data.record;
  } else {
    throw new Error(`Lark create failed: ${res.data.msg}`);
  }
}

async function larkGetRecords(tableId, filter = null) {
  const token = await getLarkToken();
  let url = `/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records?page_size=100`;
  if (filter) {
    url += `&filter=${encodeURIComponent(JSON.stringify(filter))}`;
  }

  const res = await makeRequest(
    'GET',
    'open.larksuite.com',
    url,
    { Authorization: `Bearer ${token}` }
  );

  if (res.data.code === 0) {
    return res.data.data.items || [];
  } else {
    throw new Error(`Lark get failed: ${res.data.msg}`);
  }
}

async function larkUpdateRecord(tableId, recordId, fields) {
  const token = await getLarkToken();
  const url = `/open-apis/bitable/v1/apps/${LARK_BASE_ID}/tables/${tableId}/records/${recordId}`;

  const res = await makeRequest(
    'PATCH',
    'open.larksuite.com',
    url,
    { Authorization: `Bearer ${token}` },
    { fields }
  );

  if (res.data.code === 0) {
    return res.data.data.record;
  } else {
    throw new Error(`Lark update failed: ${res.data.msg}`);
  }
}

// ============================================================================
// BUSINESS LOGIC: CREATE / GET / UPDATE ORDINI
// ============================================================================

async function createTableOrder(tableCode, items, customerName = 'Tavolo ' + tableCode, notes = '') {
  const orderId = 'ord_' + Date.now().toString(36).toUpperCase();
  const now = new Date().toISOString();
  const totalAmount = items.reduce((sum, item) => sum + (item.prezzo * item.qty), 0);

  const fields = {
    'order_id': orderId,
    'table_code': tableCode,
    'items': JSON.stringify(items), // JSON string
    'status': 'pending',
    'payment_status': 'unpaid',
    'created_at': now,
    'updated_at': now,
    'total_amount': totalAmount,
    'notes': notes,
  };

  const record = await larkCreateRecord(LARK_ORDINI_TABLE_ID, fields);
  console.log('[CREATE_ORDER]', orderId, 'table:', tableCode);
  return record;
}

async function getTableOrders(tableCode) {
  // Filter: table_code = tableCode AND status != 'cancelled'
  const filter = {
    conjunction: 'and',
    conditions: [
      { field_name: 'table_code', operator: 'is', value: [tableCode] },
      { field_name: 'status', operator: 'isNot', value: ['cancelled'] },
    ],
  };

  const records = await larkGetRecords(LARK_ORDINI_TABLE_ID, filter);
  console.log('[GET_ORDERS]', tableCode, '→', records.length, 'records');
  
  return records.map(r => ({
    recordId: r.record_id,
    ...r.fields,
  }));
}

async function markOrderPaid(orderId) {
  // Trova record by order_id
  const records = await larkGetRecords(LARK_ORDINI_TABLE_ID);
  const record = records.find(r => r.fields.order_id === orderId);

  if (!record) {
    throw new Error(`Order ${orderId} not found`);
  }

  const now = new Date().toISOString();
  const updated = await larkUpdateRecord(LARK_ORDINI_TABLE_ID, record.record_id, {
    'status': 'paid',
    'payment_status': 'paid',
    'updated_at': now,
  });

  console.log('[MARK_PAID]', orderId);
  return updated;
}

// ============================================================================
// WEBHOOK: POST TO SITO
// ============================================================================

async function notifyOrderPaid(orderId, tableCode, amount) {
  const timestamp = new Date().toISOString();

  const body = {
    order_id: orderId,
    table_code: tableCode,
    amount: amount,
    timestamp: timestamp,
  };

  try {
    const res = await makeRequest(
      'POST',
      'tierraorganic.it',
      '/api/tierra/webhook/order-paid',
      {
        'X-Tierra-Token': TIERRA_SITE_TOKEN,
        'X-Tierra-Source-Token': TIERRA_SITE_SHARED_SECRET,
      },
      body
    );

    console.log('[NOTIFY_PAID]', orderId, 'response:', res.status);
    return res.data;
  } catch (err) {
    console.error('[NOTIFY_PAID_ERROR]', err.message);
    throw err;
  }
}

// ============================================================================
// NETLIFY HANDLER
// ============================================================================

exports.handler = async (event) => {
  const { httpMethod, path, body: rawBody } = event;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Tierra-Token',
    'Content-Type': 'application/json',
  };

  // CORS preflight
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // Auth check
  const token = event.headers['x-tierra-token'];
  if (token !== TIERRA_SITE_TOKEN) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const body = rawBody ? JSON.parse(rawBody) : {};

  try {
    // POST /api/orders/create
    if (httpMethod === 'POST' && path === '/.netlify/functions/lark-orders') {
      const { table_code, items, customer_name, notes } = body;
      if (!table_code || !items) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing table_code or items' }),
        };
      }

      const record = await createTableOrder(table_code, items, customer_name, notes);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, order: record }),
      };
    }

    // GET /api/orders/:table_code
    if (httpMethod === 'GET' && path.startsWith('/.netlify/functions/lark-orders/table/')) {
      const tableCode = path.split('/table/')[1];
      const orders = await getTableOrders(tableCode);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, orders }),
      };
    }

    // PATCH /api/orders/:order_id
    if (httpMethod === 'PATCH' && path.startsWith('/.netlify/functions/lark-orders/')) {
      const orderId = path.split('/').pop();
      const updated = await markOrderPaid(orderId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, order: updated }),
      };
    }

    // POST /api/orders/:order_id/pay (marca pagato + webhook)
    if (httpMethod === 'POST' && path.endsWith('/pay')) {
      const orderId = path.split('/').slice(-2)[0];
      const { table_code, amount } = body;

      const updated = await markOrderPaid(orderId);
      await notifyOrderPaid(orderId, table_code, amount);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, order: updated, notified: true }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (err) {
    console.error('[ERROR]', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
