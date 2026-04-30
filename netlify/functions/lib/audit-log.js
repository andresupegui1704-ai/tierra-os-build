// netlify/functions/lib/audit-log.js
// Scrittura audit log su tabella Lark "AuditLog"
// Tierra OS v9.5 — Security Hardening

const { createRecord, toLarkDate } = require('./lark');

const AUDITLOG_TABLE_ID = process.env.LARK_AUDITLOG_TABLE_ID;

/**
 * Scrive una entry di audit log. Best-effort: errori non bloccano la richiesta principale.
 *
 * @param {object} entry
 * @param {string} entry.user_id
 * @param {string} entry.action  es: "login_success", "login_failed", "create_order"
 * @param {string} [entry.resource]  es: "order:ord_ABC"
 * @param {string} [entry.ip_address]
 * @param {string} [entry.user_agent]
 * @param {object} [entry.metadata]  payload aggiuntivo, serializzato a JSON
 */
async function writeAuditLog(entry) {
  if (!AUDITLOG_TABLE_ID) {
    console.warn('[audit] LARK_AUDITLOG_TABLE_ID not configured, skipping');
    return;
  }
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const fields = {
      log_id: logId,
      user_id: entry.user_id || 'anonymous',
      action: entry.action || 'unknown',
      resource: entry.resource || '',
      ip_address: entry.ip_address || '',
      user_agent: entry.user_agent || '',
      timestamp: toLarkDate(new Date()),
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : '',
    };
    await createRecord(AUDITLOG_TABLE_ID, fields);
  } catch (err) {
    // Non rilanciamo: audit log non deve mai bloccare il flusso utente
    console.error('[audit] writeAuditLog failed:', err.message);
  }
}

/**
 * Estrae IP client e User-Agent da un evento Netlify per logging.
 * @param {object} event
 * @returns {{ip_address:string, user_agent:string}}
 */
function extractRequestMeta(event) {
  const headers = event.headers || {};
  const ip =
    headers['x-nf-client-connection-ip'] ||
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['client-ip'] ||
    'unknown';
  const ua = headers['user-agent'] || headers['User-Agent'] || 'unknown';
  return { ip_address: ip, user_agent: ua };
}

module.exports = {
  writeAuditLog,
  extractRequestMeta,
};
