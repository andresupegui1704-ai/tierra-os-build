/**
 * TIERRA OS v9.4
 * tierraApi.js — SDK React Client
 * 
 * Metodi:
 *  - createTableOrder(table_code, items, customer_name, notes)
 *  - getTableOrders(table_code)
 *  - markOrderPaid(order_id, table_code, amount)  → include webhook sito
 *  - notifyOrderPaid(order_id, table_code, amount) → solo webhook
 *  - updateTierraTable(table_code, status)
 * 
 * Usage:
 *   import tierraApi from './lib/tierraApi';
 *   const orders = await tierraApi.getTableOrders('E3');
 */

const API_BASE = '/.netlify/functions';
const TIERRA_TOKEN = 'tierra2024';

// ============================================================================
// UTILITY: fetch con auth + error handling
// ============================================================================

async function apiCall(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Tierra-Token': TIERRA_TOKEN,
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error(`[tierraApi] ${path} →`, err.message);
    throw err;
  }
}

// ============================================================================
// ORDINI TAVOLO
// ============================================================================

/**
 * Crea nuovo ordine tavolo
 * @param {string} tableCode - Es. "E3", "I2"
 * @param {Array<{nome, qty, prezzo}>} items
 * @param {string} customerName - Default "Tavolo {code}"
 * @param {string} notes - Note opzionali
 * @returns {Promise<{success, order}>}
 */
async function createTableOrder(tableCode, items, customerName = null, notes = '') {
  const body = {
    table_code: tableCode,
    items: items,
    customer_name: customerName || `Tavolo ${tableCode}`,
    notes: notes,
  };

  return await apiCall('/lark-orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Ottieni ordini attivi (status != cancelled) di un tavolo
 * @param {string} tableCode
 * @returns {Promise<{success, orders: Array}>}
 */
async function getTableOrders(tableCode) {
  return await apiCall(`/lark-orders/table/${encodeURIComponent(tableCode)}`, {
    method: 'GET',
  });
}

/**
 * Marca ordine come pagato + invia webhook al sito
 * Il backend chiama tierraorganic.it/api/tierra/webhook/order-paid
 * Il sito risponde con { status: "table_freed" } che libera il tavolo
 * 
 * @param {string} orderId
 * @param {string} tableCode
 * @param {number} amount
 * @returns {Promise<{success, order, notified}>}
 */
async function markOrderPaid(orderId, tableCode, amount) {
  return await apiCall(`/lark-orders/${encodeURIComponent(orderId)}/pay`, {
    method: 'POST',
    body: JSON.stringify({
      table_code: tableCode,
      amount: amount,
    }),
  });
}

/**
 * Solo webhook (senza marcare pagato su Lark) — utility
 */
async function notifyOrderPaid(orderId, tableCode, amount) {
  return await apiCall('/lark-orders/notify', {
    method: 'POST',
    body: JSON.stringify({
      order_id: orderId,
      table_code: tableCode,
      amount: amount,
    }),
  });
}

/**
 * Aggiorna stato tavolo Tierra (chiama lark-base.js esistente)
 * @param {string} tableCode
 * @param {string} status - libero | confermato | arrivato | accorpato | cancellato
 */
async function updateTierraTable(tableCode, status) {
  return await apiCall('/lark-base', {
    method: 'POST',
    body: JSON.stringify({
      action: 'updateTable',
      table_code: tableCode,
      status: status,
    }),
  });
}

// ============================================================================
// STAMPA CASSA (proxy backend Sunmi)
// ============================================================================

/**
 * Stampa ricevuta cassa via Sunmi NT311
 * Backend chiama 192.168.1.100:9100 con bytes ESC/POS
 * 
 * @param {Object} order - { order_id, table_code, items, total_amount, ... }
 * @returns {Promise<{success}>}
 */
async function printCassa(order) {
  return await apiCall('/print-cassa', {
    method: 'POST',
    body: JSON.stringify({ order }),
  });
}

// ============================================================================
// EXPORT
// ============================================================================

const tierraApi = {
  // Ordini
  createTableOrder,
  getTableOrders,
  markOrderPaid,
  notifyOrderPaid,
  updateTierraTable,
  // Stampa
  printCassa,
};

export default tierraApi;
export {
  createTableOrder,
  getTableOrders,
  markOrderPaid,
  notifyOrderPaid,
  updateTierraTable,
  printCassa,
};
