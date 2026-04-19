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
const TIERRA_API_BASE = "https://tierra-bistro-menu.preview.emergentagent.com";
const TIERRA_TOKEN = "tierra2024";  // change for production

// ─── Low-level helper ───────────────────────────────────────────────
async function tierraRequest(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) headers["X-Tierra-Token"] = TIERRA_TOKEN;

    const res = await fetch(`${TIERRA_API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw Object.assign(new Error(err?.detail?.message || err.detail || "Request failed"), {
            status: res.status,
            data: err,
        });
    }
    return res.json();
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

/** Create a reservation from Tierra OS (auto-confirmed + email + print). */
export function createReservation({
    customer_name, customer_phone, customer_email,
    date, time, guests,
    zone, table_code, notes,
    status = "confirmed", auto_print = true,
}) {
    return tierraRequest("/api/tierra/reservations", {
        method: "POST",
        body: {
            customer_name, customer_phone, customer_email,
            date, time, guests,
            zone, table_code, notes,
            status, auto_print,
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
//  ORDERS (dine-in from the waiter's device)
// ════════════════════════════════════════════════════════════════════

/** Create a dine-in order. Auto-queues the kitchen+cashier print. */
export function createTableOrder({
    table_code, waiter,
    items,               // [{ item_id, name, price, quantity, customizations }]
    customer_name,       // optional, can be "Tavolo E1"
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
