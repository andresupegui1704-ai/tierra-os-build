# ✅ SITO → OS: Risposte alle "Richieste di Semplificazione" v1.0

**Versione**: 1.0 — risposta a `TIERRA_OS_RICHIESTE_SITO.md` v1.0
**Data**: 2026-04-29
**Status**: ✅ Tutto P0+P1 implementato + testato

---

## Concordo al 100% con la vostra strategia

Spostare logica pesante su sito è la scelta giusta. OS = light client (UI + stampa + polling), sito = orchestrator. Mi sono limitato a quello che ha senso fare lato server e a non sovra-ingegnerizzare.

---

## ✅ COMPLETATO (testato con curl, HTTP 200)

### 🔴 P0.1 — Template `lark-orders.js` completo
📄 **Download**: https://tierra-bistro-menu.preview.emergentagent.com/handoff/lark-orders-template.js

Schema speculare a `lark-prenotazioni.js` v9.2.1:
- ✅ Auth Lark (tenant token cache 90min)
- ✅ `parseBody()` robusto
- ✅ CRUD: `create | update | list | delete` (delete è soft → status=cancelled)
- ✅ Idempotency built-in (find by `order_id` prima di create)
- ✅ Validazione opzionale `X-Tierra-Source-Token` (env `TIERRA_SITE_SHARED_SECRET`)
- ✅ Pattern singolo campo TEXT serializzato (`order_id` → JSON), come fate per `booking_id`
- ✅ Helper columns suggerite: `status_label`, `customer_label`, `total_eur` (per filtri Lark UI)

ENV richieste su Netlify:
```
LARK_APP_ID, LARK_APP_SECRET, LARK_BASE_ID
LARK_ORDINI_TABLE_ID    ← creare tabella Lark "Ordini"
TIERRA_SITE_SHARED_SECRET  (opzionale)
```

### 🔴 P0.2 — SDK espanso
📄 **Download**: https://tierra-bistro-menu.preview.emergentagent.com/handoff/tierraApi.js

Aggiunti i metodi che chiedevate, **con la signature esatta che proponevate**:

```js
import {
  createTableOrder,    // (table, items, total, notes)  → POST /api/orders
  getTableOrders,      // (table)                        → GET /api/tierra/orders?table=
  markOrderPaid,       // (orderId, amount, method)      → PATCH /api/tierra/orders/{id}
  notifyOrderPaid,     // ⭐ all-in-one webhook (NEW)
  updateTierraTable,   // (codice, {status, merged_with, ...}) → PATCH /api/tierra/tables/{codice}
} from "./lib/tierraApi";
```

Bonus: l'SDK ha già `newIdempotencyKey()` integrato (auto-applicato in `createTableOrder`).

### 🔴 P0.3 — Webhook `POST /api/tierra/webhook/order-paid` ⭐
**L'avete chiesto e secondo me è la scelta migliore**. Ho preferito **Opzione B** (webhook all-in-one) come voi.

```bash
curl -X POST https://tierraorganic.it/api/tierra/webhook/order-paid \
  -H "X-Tierra-Token: tierra2024" \
  -H "Idempotency-Key: paid-<order_id>" \
  -d '{"order_id":"...", "table_code":"E3", "amount":45.50, "payment_method":"cash"}'
```

Il sito esegue **atomicamente**:
1. Marca ordine `paid` (`status`+`payment_status`+`paid_at`+`payment_method`+`paid_amount`)
2. Verifica se ci sono altri ordini aperti sul tavolo. Se NO → libera tavolo (`status=libero`, `merged_with=[]`)
3. Push echo a Lark "Ordini" (status=paid)
4. Push a Lark "Tavoli" (`/.netlify/functions/lark-tavoli` se attivato — no-op altrimenti)

Risposta:
```json
{
  "ok": true,
  "order_id": "...",
  "table_code": "E3",
  "table_status": "libero",  // o "occupato" se ci sono altri ordini sul tavolo
  "lark_updated": true,
  "order": { ... aggiornato ... }
}
```

✅ Idempotency-Key supportata (TTL 24h) — replay safety automatica.

### 🟡 P1.1 — `PATCH /api/tierra/tables/{codice}`
```bash
PATCH /api/tierra/tables/E3
Header: X-Tierra-Token: tierra2024
Body: { "status": "accorpato", "merged_with": ["E4"], "notes": "..." }
Response: { "ok": true, "table": { "codice": "E3", ... } }
```
Bonus: `GET /api/tierra/tables` restituisce tutti i tavoli con `codice` alias di `code`.

### 🟡 P1.2 — Push outgoing (config side)
✅ Modulo `tierra_os_sync.py` già pronto. Mancano i 3 valori env per attivare:
```bash
TIERRA_OS_BASE_URL=https://ostierra.netlify.app
TIERRA_OS_OUTGOING_TOKEN=<UUID che mi generate voi>
TIERRA_OS_SYNC_ENABLED=true
```

---

## 🟢 P2 — Posizionamento

| Item | Decisione | Motivazione |
|------|-----------|-------------|
| **P2.1** Dashboard "Tavoli Live" | ⏸️ Backlog — implemento dopo go-live | Utile, ma non blocca. La logica server c'è già (`/api/tierra/sync-snapshot`). 2-3h di sola UI. |
| **P2.2** Email Resend | ⏸️ Bloccato su API key | Codice `email_service.py` pronto. Inviateci la `RESEND_API_KEY` e si attiva. |
| **P2.3** QR pagamento ricevuta | ⏸️ Backlog post-MVP | Bel pattern. Richiede signature HMAC + pagina `/pay` + Stripe Payment Link. ~6h. La metto in roadmap. |

---

## 📥 COSA MI SERVE DA VOI ORA

| # | Cosa | Perché |
|---|------|--------|
| 1 | URL Netlify produzione | per `TIERRA_OS_BASE_URL` |
| 2 | UUID condiviso (`TIERRA_SITE_SHARED_SECRET`) | per validazione header bidirezionale |
| 3 | Conferma: schema items in ordine = `[{name, qty, price}]` minimal | OK lato sito (auto-resolve item_id da name) |
| 4 | Vuoi che aggiunga anche `lark-tavoli.js` template? | (Pattern identico a `lark-orders.js`) |

---

## ⚙️ COMPATIBILITÀ END-TO-END

| Vostra chiamata | Endpoint sito | Stato | Test curl |
|-----------------|---------------|-------|-----------|
| `createTableOrder("E3", items, 12, "")` | `POST /api/orders` | ✅ live | `200 OK` |
| `getTableOrders("E3")` | `GET /api/tierra/orders?table=E3&service_type=table` | ✅ live | `200 OK` |
| `markOrderPaid(id, 12, "cash")` | `PATCH /api/tierra/orders/{id}` | ✅ live | `200 OK` |
| `notifyOrderPaid({...})` ⭐ | `POST /api/tierra/webhook/order-paid` | ✅ live | `200 OK` |
| `updateTierraTable("E3", {status:"accorpato"})` | `PATCH /api/tierra/tables/E3` | ✅ live | `200 OK` |
| `getSyncSnapshot({daysAhead:14})` | `GET /api/tierra/sync-snapshot` | ✅ live | `200 OK`, `ok:true` |

---

## ⏱️ TIMELINE AGGIORNATA

| Fase | Stato | Note |
|------|-------|------|
| **P0 sito** | ✅ DONE — 29 Apr | template + SDK + webhook + alias tables |
| **P1 sito** | ✅ DONE — 29 Apr | endpoint tierra/tables + push pronto |
| **P0 OS** | ⏳ Voi | copiare `lark-orders-template.js`, importare SDK, deploy v9.4 |
| **Test E2E** | ⏳ insieme | quando ENV configurate |
| **Go Live** | 🎯 2 Mag | come da vostra timeline |

---

## 🎯 DECISIONI DI DESIGN — IL "PERCHÉ"

### Perché ho preferito **`/api/tierra/orders/{id}`** anziché `/api/orders/{id}` per PATCH
`/api/orders/{id}` esisteva già come endpoint admin con auth JWT (login admin sito). Mantenerlo separato evita che credenziali OS possano modificare ordini in modo "amministratore". OS usa solo namespace `/api/tierra/*` → policy chiara, audit più facile.

### Perché il webhook `order-paid` libera il tavolo **solo se non ci sono altri ordini aperti**
Se cameriere apre 2 conti separati sullo stesso tavolo (es. coppia che paga separato), il primo "paid" non deve bloccare l'altro. Solo l'ultimo ordine paga → tavolo libero.

### Perché `lark-orders-template.js` usa il pattern "JSON serializzato in `order_id`"
È **lo stesso pattern** di `lark-prenotazioni.js` v9.2 (booking_id). Mantenete consistenza, evitate il limite Lark API sulle TEXT columns con regex.

---

📁 **File da scaricare**:
- https://tierra-bistro-menu.preview.emergentagent.com/handoff/lark-orders-template.js
- https://tierra-bistro-menu.preview.emergentagent.com/handoff/tierraApi.js

Quando avete fatto deploy v9.4 + impostato le ENV, scrivete in chat e facciamo i 4 test E2E.

— Sito Tierra
