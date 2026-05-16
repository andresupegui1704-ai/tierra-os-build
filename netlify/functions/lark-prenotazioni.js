// netlify/functions/lark-prenotazioni.js
// Webhook receiver per prenotazioni

const { getTenantToken, createRecord, searchRecords, updateRecord } = require('./lib/lark');
const { writeAuditLog, extractRequestMeta } = require('./lib/audit-log');

const LARK_PRENOTAZIONI_TABLE_ID = process.env.LARK_PRENOTAZIONI_TABLE_ID;
const LARK_ORDINI_TABLE_ID = process.env.LARK_ORDINI_TABLE_ID;

console.log('[lark-prenotazioni] Module loaded. Tables:', {
  prenotazioni: LARK_PRENOTAZIONI_TABLE_ID,
  ordini: LARK_ORDINI_TABLE_ID,
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
      booking_id,
      customer_name,
      customer_phone,
      email,
      date,
      time,
      guests,
      table_id,
      status,
      notes,
      order_id,
    } = body;

    console.log('[lark-prenotazioni] Received booking:', {
      booking_id,
      customer_name,
      date,
      time,
      guests,
    });

    // ===== VALIDATE =====
    if (!booking_id || !customer_name || !date || !time || !guests) {
      console.error('[lark-prenotazioni] Missing required fields');
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'missing_fields',
          required: ['booking_id', 'customer_name', 'date', 'time', 'guests'],
        }),
      };
    }

    if (!LARK_PRENOTAZIONI_TABLE_ID) {
      console.error('[lark-prenotazioni] LARK_PRENOTAZIONI_TABLE_ID not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'prenotazioni_table_not_configured' }),
      };
    }

    // ===== IDEMPOTENCY CHECK =====
    const existingBookings = await searchRecords(LARK_PRENOTAZIONI_TABLE_ID, {
      filter: {
        conjunction: 'and',
        conditions: [
          {
            field_name: 'booking_id',
            operator: 'is',
            value: [booking_id],
          },
        ],
      },
    });

    if (existingBookings.length > 0) {
      console.log('[lark-prenotazioni] Booking already exists (idempotency):', booking_id);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'booking_already_exists',
          booking_id,
          record_id: existingBookings[0].record_id,
        }),
      };
    }

    // ===== CREATE LARK RECORD =====
    const now = new Date().toISOString();

    const bookingRecord = await createRecord(LARK_PRENOTAZIONI_TABLE_ID, {
      booking_id: booking_id,
      customer_name: customer_name,
      customer_phone: customer_phone || '',
      email: email || '',
      date: date,
      time: time,
      guests: guests,
      table_id: table_id || '',
      status: status || 'pending',
      notes: notes || '',
      order_id: order_id || '',
      created_at: now,
    });

    console.log('[lark-prenotazioni] Created Lark record:', bookingRecord.record_id);

    // ===== WRITE AUDIT LOG =====
    try {
      await writeAuditLog({
        action: 'booking_received',
        user_id: 'menu-site',
        resource: 'booking',
        resource_id: booking_id,
        details: {
          customer_name,
          date,
          time,
          guests,
          source: 'menu_site',
        },
      });
      console.log('[lark-prenotazioni] Audit log written');
    } catch (auditErr) {
      console.error('[lark-prenotazioni] Audit log error:', auditErr.message);
    }

    // ===== SUCCESS RESPONSE =====
    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        booking_id,
        record_id: bookingRecord.record_id,
        message: 'Booking received and logged',
        timestamp: now,
      }),
    };
  } catch (error) {
    console.error('[lark-prenotazioni] Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'internal_error',
        message: error.message || 'Unknown error',
      }),
    };
  }
};
