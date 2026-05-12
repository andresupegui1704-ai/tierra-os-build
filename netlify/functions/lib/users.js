// netlify/functions/lib/users.js
// Repository per tabella Lark "Utenti"
// Tierra OS v9.5 — Security Hardening

const { searchRecords, updateRecord, toLarkDate } = require('./lark');

const UTENTI_TABLE_ID = process.env.LARK_UTENTI_TABLE_ID;

if (!UTENTI_TABLE_ID) {
  console.warn('[users] LARK_UTENTI_TABLE_ID not configured');
}

/**
 * Trova utente per email (case-insensitive). Ritorna null se non trovato.
 * @param {string} email
 * @returns {Promise<object|null>}  { record_id, user_id, email, password_hash, name, role, active, failed_login_attempts }
 */
async function findUserByEmail(email) {
  if (!email) return null;
  const normalized = String(email).trim().toLowerCase();

  // FIX: searchRecords aspetta stringa, non oggetto. Cerchiamo tutti poi filtriamo.
  const items = await searchRecords(UTENTI_TABLE_ID, '');
  if (!items || !items.length) return null;
  
  const item = items.find(record => {
    const recordEmail = extractText(record.fields?.email || '').toLowerCase();
    return recordEmail === normalized;
  });
  
  if (!item) return null;
  return mapRecordToUser(item);
}

/**
 * Trova utente per user_id.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function findUserById(userId) {
  if (!userId) return null;
  
  // FIX: Same as above - searchRecords aspetta stringa
  const items = await searchRecords(UTENTI_TABLE_ID, '');
  if (!items || !items.length) return null;
  
  const item = items.find(record => {
    const recordUserId = extractText(record.fields?.user_id || '');
    return recordUserId === userId;
  });
  
  if (!item) return null;
  return mapRecordToUser(item);
}

/**
 * Aggiorna last_login_at e azzera failed_login_attempts.
 * @param {string} recordId
 */
async function markLoginSuccess(recordId) {
  if (!recordId) return;
  await updateRecord(UTENTI_TABLE_ID, recordId, {
    last_login_at: toLarkDate(new Date()),
    failed_login_attempts: 0,
  });
}

/**
 * Incrementa failed_login_attempts.
 * @param {string} recordId
 * @param {number} currentValue
 */
async function incrementFailedLogins(recordId, currentValue = 0) {
  if (!recordId) return;
  await updateRecord(UTENTI_TABLE_ID, recordId, {
    failed_login_attempts: (currentValue || 0) + 1,
  });
}

/**
 * Mappa un record Lark a oggetto utente normalizzato.
 * @param {object} item record Lark { record_id, fields: {...} }
 * @returns {object}
 */
function mapRecordToUser(item) {
  const f = item.fields || {};
  return {
    record_id: item.record_id,
    user_id: extractText(f.user_id),
    email: extractText(f.email)?.toLowerCase() || '',
    password_hash: extractText(f.password_hash),
    name: extractText(f.name),
    role: extractSelect(f.role),
    active: f.active === true || f.active === 'true' || f.active === 1,
    failed_login_attempts: typeof f.failed_login_attempts === 'number' ? f.failed_login_attempts : 0,
  };
}

/**
 * Estrae testo da campo Lark (può essere string o array di blocchi {text}).
 */
function extractText(field) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  if (Array.isArray(field)) {
    return field.map((b) => (typeof b === 'string' ? b : b?.text || '')).join('');
  }
  if (typeof field === 'object' && field.text) return field.text;
  return String(field);
}

/**
 * Estrae valore Single Select (può essere string o object {text}).
 */
function extractSelect(field) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field.text) return field.text;
  return String(field);
}

module.exports = {
  findUserByEmail,
  findUserById,
  markLoginSuccess,
  incrementFailedLogins,
};
