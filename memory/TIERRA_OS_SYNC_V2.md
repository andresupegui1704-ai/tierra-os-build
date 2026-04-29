# Tierra Site ↔ Tierra OS — Sync Bidirezionale (v2)

**Versione**: 2.0 — 2026-04-29
**Stato**: backend production-ready, push outgoing disabilitato di default (richiede config env)

---

## Architettura

```
                  ┌─────────────────────────┐
                  │   TIERRA SITE (E1)      │
                  │   tierraorganic.it      │
                  │   FastAPI + Mongo       │
                  └─────────────────────────┘
                     │            ▲
        outgoing push│            │ incoming (X-Tierra-Token)
        (background) │            │ + snapshot pull
                     ▼            │
                  ┌─────────────────────────┐
                  │   TIERRA OS (Netlify)   │
                  │   ostierra.netlify.app  │
                  │   Lark Base + GCal      │
                  └─────────────────────────┘
```

Le due app sono ora **bidirezionalmente** sincronizzate:
1. **OS → SITE** (già esistente): `POST /api/tierra/reservations` con `X-Tierra-Token`
2. **SITE → OS** (NEW): background push verso le Netlify Functions di Tierra OS
3. **PULL fallback** (NEW): `GET /api/tierra/sync-snapshot` e `GET /api/tierra/orders`

---

## 1. Configurazione (server side)

Aggiungi queste variabili a `/app/backend/.env`:

```bash
TIERRA_OS_BASE_URL=https://ostierra.netlify.app          # ← obbligatorio per attivare push
TIERRA_OS_RESERVATIONS_FN=/.netlify/functions/lark-prenotazioni
TIERRA_OS_ORDERS_FN=/.netlify/functions/lark-orders      # opzionale (per ordini)
TIERRA_OS_OUTGOING_TOKEN=<segreto-condiviso>             # opzionale, header X-Tierra-Source-Token
TIERRA_OS_SYNC_ENABLED=true
```

Senza `TIERRA_OS_BASE_URL`, il push è no-op (i log mostrano solo le creazioni interne).

---

## 2. Nuovi endpoint server (per Tierra OS)

Tutti richiedono `X-Tierra-Token: tierra2024`.

### 2.1 `GET /api/tierra/sync-snapshot?days_ahead=7`
Single-call: prenotazioni (oggi → +7gg), tavoli con stato attuale, ordini tavolo aperti, piatti spenti, configurazione slot, server_time. **Usa questo come endpoint di polling** ogni 30-60s.

```bash
curl -H "X-Tierra-Token: tierra2024" \
  https://tierraorganic.it/api/tierra/sync-snapshot?days_ahead=7
```

Risposta:
```json
{
  "server_time": "2026-04-29T18:00:00Z",
  "range": {"from": "2026-04-29", "to": "2026-05-06"},
  "reservations": [...],
  "tables": [...],
  "open_orders": [...],
  "menu_unavailable": [...],
  "slot_config": {...}
}
```

### 2.2 `GET /api/tierra/orders?since=&status=&service_type=&limit=`
Pull ordini con filtri. Utile come fallback se il push outgoing è disabilitato/fallisce.

### 2.3 `POST /api/tierra/sync/replay`
Re-pusha manualmente una prenotazione/ordine verso Tierra OS:
```json
{ "type": "reservation", "id": "<uuid>" }
```

### 2.4 Idempotency (NEW)
Tutti i `POST /api/tierra/*` accettano l'header opzionale **`Idempotency-Key`**.
La stessa key entro 24h ritorna la risposta cached, evitando duplicati su retry.

```bash
curl -X POST .../api/tierra/reservations \
  -H "X-Tierra-Token: tierra2024" \
  -H "Idempotency-Key: idem-20260429-001" \
  -d '{...}'
```

---

## 3. Push outgoing (SITE → OS)

Quando un cliente:
- **prenota** dal sito (`POST /api/reservations`) → background task chiama
  `${TIERRA_OS_BASE_URL}/.netlify/functions/lark-prenotazioni` con
  `{ "action": "create", "fields": { cliente, data, ora, pax, ... } }`
- **ordina** (delivery/asporto/preordine/tavolo) → background task chiama
  `${TIERRA_OS_BASE_URL}/.netlify/functions/lark-orders` (se esiste)

**Schema `fields` reservation** (compatibile con `lark-prenotazioni.js`):
```js
{
  cliente, telefono, email, data, ora, pax, tavolo, zona, note,
  status, source: "tierra_site", site_reservation_id, booking_id
}
```

Il `recordId` Lark restituito viene memorizzato sul documento reservation come `booking_id` + `os_record_id` (per allineamento futuro).

**Comportamento errori**: i fallimenti sono **fire-and-forget** (loggati come WARNING, non bloccanti). Per re-sync usa `/api/tierra/sync/replay`.

---

## 4. SDK JS aggiornato (`tierraApi.js`)

```js
import {
  getSyncSnapshot, pullOrders, replayPush,
  createReservation, newIdempotencyKey,
} from "./lib/tierraApi";

// Polling dashboard (30s)
setInterval(async () => {
  const snap = await getSyncSnapshot({ daysAhead: 14 });
  // aggiorna UI: snap.reservations, snap.open_orders, snap.tables, ...
}, 30_000);

// Creazione safe (auto-retry + idempotency)
const idem = newIdempotencyKey();
const r = await createReservation({
  customer_name: "Mario", customer_phone: "+39333", date: "2026-12-01",
  time: "20:00", guests: 4, zone: "interno"
}, { idempotencyKey: idem });
```

L'SDK ora include:
- **Auto-retry** esponenziale per errori 5xx/network (max 2 tentativi)
- **No-retry** automatico per 4xx (eccetto 429)
- Helper `newIdempotencyKey()`

---

## 5. Nuovo endpoint Netlify suggerito (`lark-orders.js`)

Per ricevere il push degli ordini SITE → OS, aggiungi una function speculare a
`lark-prenotazioni.js`:

```js
// netlify/functions/lark-orders.js
exports.handler = async (event) => {
  const { action, fields, order_id } = JSON.parse(event.body || "{}");
  // upsert su tabella Lark "Ordini" con order_id come key
  // ...
};
```

Tabella Lark "Ordini" suggerita:
- `order_id` (TEXT, key)
- `service_type` (delivery/asporto/preordine/tavolo)
- `customer_name`, `total`, `status`, `payment_status`
- `items_json` (TEXT, JSON serializzato)
- `created_at` (DATETIME)

---

## 6. Sicurezza

| Direzione | Auth | Header |
|-----------|------|--------|
| OS → SITE | Token statico | `X-Tierra-Token: tierra2024` |
| SITE → OS | Token opzionale | `X-Tierra-Source-Token: <segreto>` |
| Idempotency | Per request | `Idempotency-Key: <uuid>` |

**Raccomandazioni produzione**:
- Cambiare `TIERRA_TOKEN` con un valore casuale (es. 32 char)
- Configurare `TIERRA_OS_OUTGOING_TOKEN` e validarlo lato Netlify
- Abilitare CORS strict su SITE quando OS è frontend (attualmente `*`)

---

## 7. Roadmap

- [ ] Webhook outgoing su transizioni status (es. `confirmed → arrived`)
- [ ] SSE/WebSocket realtime invece di polling 30s
- [ ] Reconciliation job: confronta site vs OS ogni notte e re-pusha le divergenze
