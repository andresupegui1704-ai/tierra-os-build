/**
 * ════════════════════════════════════════════════════════════════════
 *  TIERRA API SDK — Client JavaScript for Tierra OS integration
 * ════════════════════════════════════════════════════════════════════
 *
 *  Drop this file into your Tierra OS Netlify app (src/lib/tierraApi.js)
 *  and import the functions you need. No external dependencies.
 *
 *  Works in:
 *    - Browser (fetch native)
 *    - Node.js 18+ (fetch native)
 *    - Lark Base HTTP automations (use the pre-built JSON bodies below)
 *
 *  License: MIT — free to use & modify.
 */

// ─── Config ─────────────────────────────────────────────────────────
const TIERRA_API_BASE = "https://tierraorganic.it";   // production
const TIERRA_TOKEN = "tierra2024";  // change for production

// ─── Low-level helper ───────────────────────────────────────────────
async function tierraRequest(path, { method = "GET", body, auth = true, idempotencyKey, retries = 2 } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) headers["X-Tierra-Token"] = TIERRA_TOKEN;
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(`${TIERRA_API_BASE}${path}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                // 4xx → don't retry (except 429)
                if (res.status >= 400 && res.status < 500 && res.status !== 429) {
                    throw Object.assign(new Error(err?.detail?.message || err.detail || "Request failed"), {
                        status: res.status, data: err,
                    });
                }
                throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, data: err });
            }
            return res.json();
        } catch (e) {
            lastErr = e;
            if (e.status && e.status < 500 && e.status !== 429) throw e;
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
            }
        }
    }
    throw lastErr;
}

// ─── Helper: generate a UUID-like idempotency key ───────────────────
export function newIdempotencyKey() {
    return "idem-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

// ════════════════════════════════════════════════════════════════════
//  MENU — toggle availability of dishes
// ════════════════════════════════════════════════════════════════════

/** Update availability for ONE dish. Match by id (preferred) or name. */
export function setDishAvailability({ id, name, available }) {
    return tierraRequest("/api/menu/availability", {
        method: "PATCH",
        body: { items: [{ ...(id ? { id } : { name }), available }] },
    });
}

/** Bulk update — useful for morning sync. */
export function setDishAvailabilityBulk(items) {
    // items: [{ id?, name?, available }, ...]
    return tierraRequest("/api/menu/availability", {
        method: "PATCH",
        body: { items },
    });
}

// ════════════════════════════════════════════════════════════════════
//  RESERVATIONS
// ════════════════════════════════════════════════════════════════════

/** Check slot availability BEFORE offering the time to the customer.
 *  Returns: { remaining_total, remaining_by_zone, can_fit, saturated, ... }
 */
export function checkAvailability({ date, time, guests = 1, zone }) {
    const q = new URLSearchParams({ date, time, guests: String(guests) });
    if (zone) q.append("zone", zone);
    return tierraRequest(`/api/reservations/availability?${q.toString()}`, { auth: false });
}

/** Create a reservation from Tierra OS (auto-confirmed + email + print).
 *  Pass `idempotencyKey` to safely retry on network errors without creating duplicates. */
export function createReservation({
    customer_name, customer_phone, customer_email,
    date, time, guests,
    zone, table_code, notes,
    status = "confirmed", auto_print = true,
    booking_id,
}, { idempotencyKey } = {}) {
    return tierraRequest("/api/tierra/reservations", {
        method: "POST",
        idempotencyKey: idempotencyKey || newIdempotencyKey(),
        body: {
            customer_name, customer_phone, customer_email,
            date, time, guests,
            zone, table_code, notes,
            status, auto_print, booking_id,
        },
    });
}

/** Update a reservation (re-checks capacity if time/guests/zone change). */
export function updateReservation(reservationId, patch) {
    // patch: any of { customer_name, customer_phone, customer_email, date, time, guests, zone, table_code, notes, status }
    return tierraRequest(`/api/tierra/reservations/${reservationId}`, {
        method: "PATCH",
        body: patch,
    });
}

/** Soft-cancel (frees the slot). */
export function cancelReservation(reservationId) {
    return tierraRequest(`/api/tierra/reservations/${reservationId}`, {
        method: "DELETE",
    });
}

// ════════════════════════════════════════════════════════════════════
//  TABLES / DINING ROOM
// ════════════════════════════════════════════════════════════════════

/** List all tables, optionally filtered by zone, with today's reservations. */
export function listTables({ zone, includeReservations = true } = {}) {
    const q = new URLSearchParams();
    if (zone) q.append("zone", zone);
    q.append("include_reservations", String(includeReservations));
    return tierraRequest(`/api/tables?${q.toString()}`, { auth: false });
}

/** Get a single table by code (e.g. "E1"). */
export function getTable(code) {
    return tierraRequest(`/api/tables/${code}`, { auth: false });
}

/** Update table state. status: libero | confermato | arrivato | accorpato | cancellato | occupato */
export function updateTable(code, { status, merged_with, capacity, label } = {}) {
    return tierraRequest(`/api/tables/${code}`, {
        method: "PATCH",
        body: { status, merged_with, capacity, label },
    });
}

/** List open orders for a table (useful to see current check). */
export function listTableOrders(code, { openOnly = true } = {}) {
    return tierraRequest(`/api/tables/${code}/orders?open_only=${openOnly}`, { auth: false });
}

/** Close table on payment — marks all open orders completed + table libero. */
export function closeTable(code) {
    return tierraRequest(`/api/tables/${code}/close`, { method: "POST" });
}

// ════════════════════════════════════════════════════════════════════
//  SYNC — single-call snapshot + pull fallbacks (NEW v2)
// ════════════════════════════════════════════════════════════════════

/** Single-call sync snapshot.
 *  Returns: { reservations, tables, open_orders, menu_unavailable, slot_config, server_time, range }
 *  Use as the polling endpoint for the Tierra OS dashboard (every 30-60s).
 */
export function getSyncSnapshot({ daysAhead = 7 } = {}) {
    return tierraRequest(`/api/tierra/sync-snapshot?days_ahead=${daysAhead}`);
}

/** Pull orders (delivery / asporto / preordine / tavolo) — fallback when site→OS push isn't available. */
export function pullOrders({ since, status, serviceType, limit = 200 } = {}) {
    const q = new URLSearchParams({ limit: String(limit) });
    if (since) q.append("since", since);
    if (status) q.append("status", Array.isArray(status) ? status.join(",") : status);
    if (serviceType) q.append("service_type", serviceType);
    return tierraRequest(`/api/tierra/orders?${q.toString()}`);
}

/** Manually re-trigger the site→OS push (e.g. after OS downtime). */
export function replayPush({ type, id }) {
    return tierraRequest("/api/tierra/sync/replay", {
        method: "POST",
        body: { type, id },
    });
}

// ════════════════════════════════════════════════════════════════════
//  ORDERS (dine-in from the waiter's device)
// ════════════════════════════════════════════════════════════════════

/** Create a dine-in order — OS-style minimal signature (preferred).
 *  @param {string} table       e.g. "E3"
 *  @param {Array}  items       [{ name, qty, price }] — item_id auto-resolto da name
 *  @param {number} total       (optional, server ricalcola)
 *  @param {string} notes
 */
export function createTableOrder(table, items, total, notes = "") {
    return tierraRequest("/api/orders", {
        method: "POST",
        auth: true,                               // X-Tierra-Token
        idempotencyKey: newIdempotencyKey(),
        body: {
            service_type: "table",
            table,
            items,                                // [{name, qty, price}]
            total,
            notes,
            created_by: "tierra_os",
            origin_url: "tierra-os",
        },
    });
}

/** Read open orders for a table (poll every 30s from OS). */
export function getTableOrders(table) {
    return tierraRequest(
        `/api/tierra/orders?table=${encodeURIComponent(table)}&service_type=table`,
        { auth: true },
    );
}

/** Mark order as paid (cameriere clicks "✓ Pagato" on OS).
 *  Triggers: order.status=paid + table back to LIBERO + Lark sync.
 */
export function markOrderPaid(orderId, amount, paymentMethod = "cash") {
    return tierraRequest(`/api/tierra/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        auth: true,
        body: {
            status: "paid",
            payment_status: "paid",
            payment_method: paymentMethod,
            paid_at: new Date().toISOString(),
        },
    });
}

/** ⭐ All-in-one webhook: marca pagato + libera tavolo + sync Lark.
 *  Preferito a markOrderPaid quando devi liberare il tavolo subito.
 */
export function notifyOrderPaid({ order_id, table_code, amount, payment_method = "cash", paid_at }) {
    return tierraRequest("/api/tierra/webhook/order-paid", {
        method: "POST",
        auth: true,
        idempotencyKey: `paid-${order_id}`,
        body: {
            order_id, table_code, amount, payment_method,
            paid_at: paid_at || new Date().toISOString(),
        },
    });
}

// ════════════════════════════════════════════════════════════════════
//  TABLES — variant Tierra-namespaced (P1.1)
// ════════════════════════════════════════════════════════════════════

/** Update table state via Tierra-namespaced endpoint (alias of /api/tables).
 *  Accepts both IT (libero/riservato/...) and EN (free/reserved/...) statuses.
 */
export function updateTierraTable(codice, { status, merged_with, capacity, label, notes } = {}) {
    return tierraRequest(`/api/tierra/tables/${encodeURIComponent(codice)}`, {
        method: "PATCH",
        body: { status, merged_with, capacity, label, notes },
    });
}

// ════════════════════════════════════════════════════════════════════
//  LEGACY: createTableOrder con signature object (back-compat)
// ════════════════════════════════════════════════════════════════════

/** @deprecated Use createTableOrder(table, items, total, notes) instead. */
export function createTableOrderLegacy({
    table_code, waiter,
    items,
    customer_name,
    notes,
}) {
    return tierraRequest("/api/orders", {
        method: "POST",
        auth: false,
        body: {
            service_type: "tavolo",
            table_code,
            waiter,
            items,
            customer_name: customer_name || `Tavolo ${table_code}`,
            customer_phone: "-",
            origin_url: "tierra-os",
            notes,
        },
    });
}

// ════════════════════════════════════════════════════════════════════
//  USAGE EXAMPLES (copy-paste)
// ════════════════════════════════════════════════════════════════════

/*
// ─── Morning: sync disponibilità piatti ─────────────────────────
import { setDishAvailabilityBulk } from "./lib/tierraApi";

async function syncMorningMenu() {
    const piattiDelGiorno = [
        { name: "Avocado Toast", available: true },
        { name: "Poke Media Bowl", available: true },
        { name: "Ceviche di salmone", available: false },
    ];
    const result = await setDishAvailabilityBulk(piattiDelGiorno);
    console.log(`Aggiornati ${result.updated.length}, non trovati:`, result.not_found);
}

// ─── Form nuova prenotazione con feedback live ───────────────────
import { checkAvailability, createReservation } from "./lib/tierraApi";

async function onTimeChange(formData) {
    try {
        const info = await checkAvailability({
            date: formData.date, time: formData.time,
            guests: formData.guests, zone: formData.zone,
        });
        if (!info.can_fit) {
            showWarning(`Fascia ${info.slot_start}-${info.slot_end} satura (${info.booked_total}/${info.max_total})`);
        } else {
            showOk(`${info.remaining_total} posti disponibili`);
        }
    } catch (e) {
        console.error(e);
    }
}

async function submitReservation(form) {
    try {
        const res = await createReservation(form);
        toast.success(`Prenotazione #${res.id.slice(0,6)} confermata — stampa in corso`);
    } catch (e) {
        if (e.status === 409) {
            toast.error(e.data.detail.message);
        } else {
            toast.error("Errore: " + e.message);
        }
    }
}

// ─── Cameriere prende ordine al tavolo ───────────────────────────
import { createTableOrder } from "./lib/tierraApi";

const order = await createTableOrder({
    table_code: "E1",
    waiter: "Marco",
    items: [
        {
            item_id: "9ad49951-a375-4f5e-9105-c89bb052de2a",
            name: "Poke Media Bowl",
            price: 13,
            quantity: 2,
            customizations: [
                { group_name: "Base di carboidrati", option_names: ["Riso Venere"], price_delta: 0 },
                { group_name: "Proteina", option_names: ["Pastrami di Salmone"], price_delta: 3 }
            ]
        }
    ],
    notes: "Senza glutine per un commensale"
});
// → kitchen + cashier tickets printed automatically

// ─── Gestione tavoli in tempo reale ──────────────────────────────
import { listTables, updateTable, closeTable } from "./lib/tierraApi";

// Refresh piantina ogni 10 secondi
setInterval(async () => {
    const tables = await listTables({ zone: "esterno" });
    renderMap(tables);  // tua funzione di render
}, 10000);

// Cliente arrivato
await updateTable("E1", { status: "arrivato" });

// Accorpamento tavoli
await updateTable("E3", { status: "accorpato", merged_with: ["E4"], capacity: 4 });
await updateTable("E4", { status: "accorpato", merged_with: ["E3"] });

// Incasso
await closeTable("E1");
*/
