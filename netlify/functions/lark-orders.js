// netlify/functions/lark-orders.js
// Production-ready webhook receiver for menu site orders
// Tierra OS v9.5

const { getTenantToken, createRecord, searchRecords, updateRecord } = require('./lib/lark');
const { verifyToken } = require('./lib/jwt');
const { writeAuditLog, extractRequestMeta } = require('./lib/audit-log');

const LARK_ORDERS_TABLE_ID = process.env.LARK_ORDERS_TABLE_ID;
const LARK_PRENOTAZIONI_TABLE_ID = process.env.LARK_PRENOTAZIONI_TABLE_ID;

console.log('[lark-orders] Module loaded. Tables:', {
  orders: LARK_ORDERS_TABLE_ID,
  prenotazioni: LARK_PRENOTAZIONI_TABLE_ID,
});

exports.handler = async (event) => {
  const meta = extractRequestMeta(event);

  // CORS preflight
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
    // ===== 1. PARSE INPUT =====
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'invalid_json' }),
      };
    }

    const {
      order_id,
      customer_name,
      customer_phone,
      service_type,
      items,
      total,
      delivery_address,
      notes,
      reservation_id,
    } = body;

    console.log('[lark-orders] Received order:', {
      order_id,
      customer_name,
      items_count: items?.length,
      total,
      service_type,
    });

    // ===== 2. VALIDATE REQUIRED FIELDS =====
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
      console.error('[lark-orders] LARK_ORDERS_TABLE_ID not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'orders_table_not_configured' }),
      };
    }

    // ===== 3. IDEMPOTENCY CHECK =====
    const idempotencyKey = event.headers['x-idempotency-key'];
    console.log('[lark-orders] Idempotency key:', idempotencyKey);

    const existingOrders = await searchRecords(LARK_ORDERS_TABLE_ID, {
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
    });

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

    // ===== 4. CREATE LARK RECORD =====
    const now = new Date().toISOString();
    const itemsJson = JSON.stringify(items);

    const orderRecord = await createRecord(LARK_ORDERS_TABLE_ID, {
      order_id: order_id,
      customer_name: customer_name || 'N/A',
      customer_phone: customer_phone || '',
      service_type: service_type || 'asporto',
      items_json: itemsJson,
      total: total,
      delivery_address: delivery_address || '',
      notes: notes || '',
      status: 'confirmed',
      created_at: now,
      reservation_id: reservation_id || '',
    });

    console.log('[lark-orders] Created Lark record:', orderRecord.record_id);

    // ===== 5. LINK TO RESERVATION (if provided) =====
    if (reservation_id && LARK_PRENOTAZIONI_TABLE_ID) {
      try {
        const reservations = await searchRecords(LARK_PRENOTAZIONI_TABLE_ID, {
          filter: {
            conjunction: 'and',
            conditions: [
              {
                field_name: 'booking_id',
                operator: 'is',
                value: [reservation_id],
              },
            ],
          },
        });

        if (reservations.length > 0) {
          const resRecord = reservations[0];
          await updateRecord(LARK_PRENOTAZIONI_TABLE_ID, resRecord.record_id, {
            order_id: order_id,
            status: 'order_confirmed',
          });
          console.log('[lark-orders] Linked order to reservation:', reservation_id);
        }
      } catch (err) {
        console.error('[lark-orders] Error linking reservation:', err.message);
        // Don't fail order if linking fails
      }
    }

    // ===== 6. WRITE AUDIT LOG =====
    try {
      await writeAuditLog({
        action: 'order_received',
        user_id: 'menu-site',
        resource: 'order',
        resource_id: order_id,
        details: {
          items_count: items.length,
          total,
          service_type,
          source: 'menu_site',
        },
      });
      console.log('[lark-orders] Audit log written');
    } catch (auditErr) {
      console.error('[lark-orders] Audit log error:', auditErr.message);
      // Don't fail if audit fails
    }

    // ===== 7. SUCCESS RESPONSE =====
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
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'internal_error',
        message: error.message || 'Unknown error',
      }),
    };
  }
};
