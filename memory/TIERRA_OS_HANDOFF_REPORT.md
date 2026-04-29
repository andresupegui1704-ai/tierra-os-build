# 📋 Handoff Tierra Site → Tierra OS — Report di Allineamento

**Versione**: 1.0
**Data**: 2026-04-29
**Scopo**: allineare le 2 app per cooperazione live (tavoli, ordini, prenotazioni)
**Da**: Tierra Site (E1, FastAPI, `tierraorganic.it`)
**A**: Tierra OS (Netlify, `ostierra.netlify.app`, Lark Base + GCal)

---

## 🎯 Obiettivo finale

| Flusso | Sorgente | Destinazione | Latenza richiesta |
|--------|----------|--------------|-------------------|
| Cliente prenota su sito | Sito | Lark + GCal | < 5s |
| OS crea prenotazione manuale | OS (Lark) | Sito (DB + stampante) | live |
| Cameriere cambia stato tavolo su OS | OS | Sito | < 5s |
| Ordine delivery/asporto/preorder pagato | Sito | Lark "Ordini" + stampante locale | < 10s |
| Ordine al tavolo (waiter) | Sito | Lark "Ordini" + stampante kitchen+cashier | < 5s |
| Disponibilità piatto cambiata su OS | OS | Sito menu | < 30s |

---

## ✅ COSA IL SITO GIÀ ESPONE (production-ready)

Tutti gli endpoint sono sotto `https://tierraorganic.it/api/` e richiedono header `X-Tierra-Token: tierra2024` (configurabile).

### Prenotazioni (OS → Sito)
- `POST /api/tierra/reservations` — crea + auto-conferma + auto-stampa (supporta `Idempotency-Key`)
- `PATCH /api/tierra/reservations/{id}` — update (re-check capacità)
- `DELETE /api/tierra/reservations/{id}` — soft cancel
- `GET /api/reservations/availability?date=&time=&guests=&zone=` — controllo capienza prima di offrire lo slot

### Tavoli (OS ↔ Sito)
- `GET /api/tables?include_reservations=true` — lista 16 tavoli (I1-I8, E1-E8) con prenotazioni di oggi
- `PATCH /api/tables/{code}` — cambia stato (`libero | confermato | arrivato | accorpato | cancellato | occupato`), `merged_with`, `capacity`
- `GET /api/tables/{code}/orders?open_only=true` — ordini aperti del tavolo
- `POST /api/tables/{code}/close` — paga/chiude tavolo

### Menu (OS → Sito)
- `PATCH /api/menu/availability` — bulk on/off piatti (match by id o name)
- `POST /api/webhooks/menu/availability` — singolo (auth alternativa: `X-Webhook-Token`)

### Sync globale (OS pull)
- **`GET /api/tierra/sync-snapshot?days_ahead=7`** ⭐ — single-call: prenotazioni + tavoli + ordini aperti + piatti spenti + slot config + server_time
- `GET /api/tierra/orders?since=&status=&service_type=&limit=` — pull ordini filtrati
- `POST /api/tierra/sync/replay` — re-push manuale post-downtime

### Stampa (già automatica)
Quando una prenotazione passa a `confirmed`, o un ordine al tavolo viene creato, oppure un ordine delivery/asporto viene pagato → stampa automatica via Sunmi (kitchen + cashier).
**Nessuna azione richiesta lato OS** per stampare: basta che usi gli endpoint sopra, la stampa parte sola.

### Slot/Capienza
Default: slot 60min, max 16 (10 interno + 6 esterno). Modificabile via `/api/admin/slots/config`.

---

## 🔴 COSA SERVE FARE LATO TIERRA OS

### 1️⃣ Outgoing push: SITE → OS (ricezione)
Il sito è già pronto a chiamarvi quando un cliente prenota/ordina. **Mi servono questi endpoint Netlify:**

#### A) Aggiornare `lark-prenotazioni.js` per ricevere anche le `action: "create"` dal sito
**Body inviato dal sito**:
```json
{
  "action": "create",
  "fields": {
    "cliente": "Mario Rossi",
    "telefono": "+39333...",
    "email": "mario@...",
    "data": "2026-12-01",
    "ora": "20:00",
    "pax": 4,
    "tavolo": "",
    "zona": "interno",
    "note": "...",
    "status": "pending",
    "source": "tierra_site",
    "site_reservation_id": "<uuid sito>",
    "booking_id": "<uuid sito>"
  }
}
```
**Risposta attesa**:
```json
{ "ok": true, "recordId": "rec...", "fields": {...} }
```

✅ La funzione esiste già (v9.2). Solo dobbiamo verificare che:
- Accetti `source: "tierra_site"` senza errori
- Salvi `site_reservation_id` (così possiamo correlare bidirezionalmente)
- Sincronizzi anche su GCal (chiamata interna a `gcal-prenotazioni`)

#### B) Creare nuovo `lark-orders.js`
**Schema tabella Lark "Ordini" suggerito**:
| Field | Type | Note |
|-------|------|------|
| order_id | TEXT (key) | UUID dal sito |
| service_type | TEXT | delivery/asporto/preordine/tavolo |
| customer_name | TEXT | |
| customer_phone | TEXT | |
| total | NUMBER | EUR |
| items_count | NUMBER | |
| items_json | TEXT | JSON serializzato (come booking_id) |
| status | TEXT | open/preparing/ready/completed/cancelled |
| payment_status | TEXT | paid/initiated/not_required |
| table_code | TEXT | solo per "tavolo" |
| scheduled_time | DATETIME | |
| created_at | DATETIME | |

**Body ricevuto**:
```json
{
  "action": "create",
  "fields": { ... come sopra, items serializzati in items_json ... }
}
```

#### C) Token condiviso (opzionale ma raccomandato)
Decidiamo un token: es. `TIERRA_SITE_TO_OS_TOKEN=<32char>`.
Il sito lo invia come header `X-Tierra-Source-Token`.
Voi lo validate nelle 2 functions. Bloccando push da fuori.

---

### 2️⃣ Outgoing push: OS → SITE (cose da chiamare voi)

Quando l'OS modifica qualcosa che il sito deve sapere, chiamate il sito:

| Trigger su OS | Endpoint sito da chiamare | Body |
|---------------|---------------------------|------|
| Stato tavolo cambia (Lark "Tavoli") | `PATCH /api/tables/{code}` | `{"status": "..."}` |
| Prenotazione modificata su Lark | `PATCH /api/tierra/reservations/{id}` | i campi modificati |
| Prenotazione annullata su Lark | `DELETE /api/tierra/reservations/{id}` | — |
| Disponibilità piatto cambiata | `PATCH /api/menu/availability` | `{"items":[{"name":"...","available":false}]}` |
| Nuova prenotazione su Lark | `POST /api/tierra/reservations` (con `Idempotency-Key: <recordId Lark>`) | tutti i campi |

**Tutti gli endpoint richiedono header**: `X-Tierra-Token: tierra2024`

---

### 3️⃣ Polling fallback (raccomandato)

Il dashboard OS dovrebbe pollare ogni 30s questo endpoint singolo:

```js
GET https://tierraorganic.it/api/tierra/sync-snapshot?days_ahead=14
Header: X-Tierra-Token: tierra2024
```

Risposta unica con tutto:
- `reservations`: prenotazioni 14gg
- `tables`: 16 tavoli con stato live
- `open_orders`: ordini al tavolo aperti
- `menu_unavailable`: piatti spenti
- `slot_config`: capienza

Questo garantisce **eventual consistency** anche se un push fallisce.

---

## ❓ DOMANDE PER LA CHAT OS

Per finalizzare la sincronizzazione, mi servono queste informazioni:

1. **`lark-orders.js`**: lo create voi, o vi mando il template completo? Schema tabella Lark "Ordini" già esiste?
2. **Token outgoing condiviso**: lo generate voi e me lo passate, o lo decidiamo qui (es. UUID random)?
3. **Webhook OS → Sito su tavoli**: oggi quando un cameriere su OS marca un tavolo come "occupato", chiamate già un endpoint del sito? Se no, posso aggiungere io la logica lato vostro?
4. **GCal per ordini**: vogliamo eventi GCal anche per ordini delivery/asporto a orario programmato? O solo per le prenotazioni?
5. **Tabella Lark "Tavoli"**: esiste già? Se sì, schema (codice, zona, stato, capacità)? Così posso allineare i campi.
6. **Rate limit Netlify Functions**: piano free è 125k invocazioni/mese — il polling 30s sono ~85k/mese da un singolo client. Va bene?
7. **Prenotazioni "pending" da sito**: vanno mostrate diversamente dalle "confirmed"? Su Lark/GCal serve un colorId diverso? (Oggi GCal usa: 10=verde confermata, 5=giallo in_attesa, 11=rosso annullata.)

---

## 🔒 Configurazione finale richiesta

### Lato Sito (`/app/backend/.env`)
```bash
# Per attivare push outgoing al vostro Netlify
TIERRA_OS_BASE_URL=https://ostierra.netlify.app
TIERRA_OS_RESERVATIONS_FN=/.netlify/functions/lark-prenotazioni
TIERRA_OS_ORDERS_FN=/.netlify/functions/lark-orders
TIERRA_OS_OUTGOING_TOKEN=<TOKEN_DA_CONCORDARE>
TIERRA_OS_SYNC_ENABLED=true
```

### Lato OS (Netlify env vars)
```bash
TIERRA_SITE_BASE_URL=https://tierraorganic.it
TIERRA_SITE_TOKEN=tierra2024              # X-Tierra-Token in tutte le chiamate al sito
TIERRA_SITE_SHARED_SECRET=<TOKEN_DA_CONCORDARE>  # validate X-Tierra-Source-Token in entrata
```

---

## 🧪 Test E2E proposto

Una volta configurato:

1. **Test A — Prenotazione da sito**: cliente prenota su `tierraorganic.it/prenota` → entro 5s deve apparire su Lark + GCal con `source=tierra_site`
2. **Test B — Prenotazione da OS**: cameriere crea prenotazione su Lark → in pochi secondi deve apparire nel dashboard admin del sito + (se confirmed) stampa Sunmi
3. **Test C — Tavolo occupato**: cameriere su OS marca E3 → "occupato" → frontend sito `/admin → Tavoli` deve riflettere entro 30s (polling) o subito (push)
4. **Test D — Ordine delivery pagato**: cliente paga su Stripe → entro 10s appare su Lark "Ordini" + stampa Sunmi
5. **Test E — Piatto spento**: admin OS spegne "Avocado Toast" → frontend `/menu` lo mostra "Esaurito" entro 30s

---

## 📂 File di riferimento

Lato sito (E1):
- `/app/backend/server.py` — tutti gli endpoint sopra
- `/app/backend/tierra_os_sync.py` — modulo push outgoing
- `/app/integrations/tierra_os/tierraApi.js` — SDK JS pronto da copiare nel repo OS
- `/app/memory/TIERRA_OS_SYNC_V2.md` — doc tecnica completa
- `/app/memory/TIERRA_OS_TABLES_API.md` — schema tavoli
- `/app/memory/TIERRA_OS_RESERVATIONS_API.md` — schema prenotazioni

---

## ⚡ Status oggi (29 Apr 2026)

| Componente | Stato |
|------------|-------|
| Sito API (incoming OS→Site) | ✅ live |
| Sito snapshot endpoint | ✅ live, testato |
| Sito idempotency layer | ✅ live, testato |
| Sito → push OS reservations | ⏸️ pronto, in attesa di `TIERRA_OS_BASE_URL` |
| Sito → push OS orders | ⏸️ pronto, in attesa di `lark-orders.js` |
| OS → push site su tavoli | ❓ da confermare |
| Test E2E A-E | ⏸️ in attesa configurazione |

**Quando sei pronto, rispondi al primo punto delle domande sopra (template `lark-orders.js`?) e procediamo.**
