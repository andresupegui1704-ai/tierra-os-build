// netlify/functions/lark-orders.js
// Tierra OS v9.5 — Webhook receiver for menu site orders

const { createRecord, searchRecords } = require('./lib/lark');

const LARK_ORDERS_TABLE_ID = process.env.LARK_ORDINI_TABLE_ID;

console.log('[lark-orders] Module loaded. Orders table:', LARK_ORDERS_TABLE_ID);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'method_not_allowed' }),
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'invalid_json' }) };
    }

    const { order_id, customer_name, customer_phone, service_type, items, total, delivery_address, notes, reservation_id } = body;

    console.log('[lark-orders] Received order:', {
      order_id,
      customer_name,
      items_count: items ? items.length : 0,
      total,
      service_type,
    });

    if (!order_id || !items || !Array.isArray(items) || items.length === 0 || total === undefined) {
      console.error('[lark-orders] Missing required fields');
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'missing_fields',
          required: ['order_id', 'items', 'total'],
        }),
      };
    }

    if (!LARK_ORDERS_TABLE_ID) {
      console.error('[lark-orders] LARK_ORDINI_TABLE_ID not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'orders_table_not_configured' }),
      };
    }

    // IDEMPOTENCY CHECK
    let existingOrders = [];
    try {
      existingOrders = await searchRecords(LARK_ORDERS_TABLE_ID, {
        filter: {
          conjunction: 'and',
          conditions: [
            {
              field_name: 'order_id',
              operator: 'is',
              value: [order_id],
            },
          ],
        },
        page_size: 10,
      });
      console.log('[lark-orders] Idempotency check: found ' + existingOrders.length + ' existing orders');
    } catch (searchErr) {
      console.error('[lark-orders] Search failed (continuing anyway):', searchErr.message);
    }

    if (existingOrders.length > 0) {
      console.log('[lark-orders] Order already exists (idempotency):', order_id);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'order_already_exists',
          order_id,
          record_id: existingOrders[0].record_id,
        }),
      };
    }

    // CREATE LARK RECORD
    const now = new Date().toISOString();
    const itemsJson = JSON.stringify(items);

    const fields = {
      order_id: order_id,
      customer_name: customer_name || 'N/A',
      customer_phone: customer_phone || '',
      service_type: service_type || 'asporto',
      items_json: itemsJson,
      total_amount: total,
      delivery_address: delivery_address || '',
      notes: notes || '',
      status: 'pending',
      payment_status: 'unpaid',
      created_at: Math.floor(Date.now() / 1000),
      created_by: 'menu-site',
      reservation_id: reservation_id || '',
    };

    console.log('[lark-orders] Creating record with fields:', Object.keys(fields).join(','));

    const orderRecord = await createRecord(LARK_ORDERS_TABLE_ID, fields);

    console.log('[lark-orders] Created Lark record:', orderRecord.record_id);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        order_id,
        record_id: orderRecord.record_id,
        message: 'Order received and logged',
        timestamp: now,
      }),
    };
  } catch (error) {
    console.error('[lark-orders] Unexpected error:', error);
    console.error('[lark-orders] Stack:', error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'internal_error',
        message: error.message || 'Unknown error',
      }),
    };
  }
};
