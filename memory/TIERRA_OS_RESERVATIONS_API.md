# 🗓️ Tierra OS — API Prenotazioni + Capienza per Fasce Orarie

Questa guida integra e completa `TIERRA_OS_TABLES_API.md`. Descrive come Tierra OS può:
1. Creare/aggiornare/cancellare prenotazioni
2. Verificare la capienza per fascia oraria **prima** di offrirla al cliente
3. Ricevere blocchi automatici quando una fascia è satura
4. Triggerare la stampa automatica su conferma

---

## 🔐 Auth
Tutti gli endpoint di scrittura: `X-Tierra-Token: tierra2024`
**Base URL:** `https://tierra-bistro-menu.preview.emergentagent.com`

---

## 🕐 Come funzionano le fasce orarie

- **Durata slot**: 60 minuti (default, configurabile in admin)
- **Capienza totale**: 16 coperti per slot
- **Capienza per zona**: Interno 10 · Esterno 6
- Una prenotazione alle 20:15 ricade nello slot 20:00-21:00
- Conta le prenotazioni con stato `pending`, `confirmed`, `arrived`
  *(Cancellate e no_show non vengono conteggiate)*

---

## 📡 Endpoint disponibili

### 1. Availability — verifica capienza (pubblico)

```
GET /api/reservations/availability?date=2026-04-20&time=20:15&guests=4&zone=esterno
```

**Risposta:**
```json
{
  "date": "2026-04-20",
  "slot_start": "20:00",
  "slot_end": "21:00",
  "slot_minutes": 60,
  "booked_total": 6,
  "booked_by_zone": {"interno": 0, "esterno": 6},
  "max_total": 16,
  "max_by_zone": {"interno": 10, "esterno": 6},
  "remaining_total": 10,
  "remaining_by_zone": {"interno": 10, "esterno": 0},
  "saturated": false,
  "can_fit": false
}
```

💡 **Use case Tierra OS**: chiamalo in tempo reale quando l'operatore digita ora + coperti → mostri subito un badge "6 posti disponibili" o "SATURO".

### 2. Crea prenotazione

```
POST /api/tierra/reservations
Headers: X-Tierra-Token: tierra2024
```

**Body:**
```json
{
  "customer_name": "Rossi Mario",
  "customer_phone": "+393331234567",
  "customer_email": "rossi@example.com",
  "date": "2026-04-20",
  "time": "20:15",
  "guests": 4,
  "zone": "esterno",
  "table_code": "E1",
  "notes": "Anniversario · torta a sorpresa",
  "status": "confirmed",
  "auto_print": true
}
```

**Campi opzionali:** `customer_email`, `zone`, `table_code`, `notes`, `status` (default `confirmed`), `auto_print` (default `true`).

**Risposta 201:** oggetto `Reservation` completo con `source: "tierra_os"`.

**Errore 409 (slot saturo):**
```json
{
  "detail": {
    "message": "Zona 'esterno' satura nella fascia 20:00-21:00: 6/6 già prenotati.",
    "availability": { ... }
  }
}
```

💡 Se status=`confirmed` (default):
- Email automatica al cliente (se email presente)
- Print job accodato (scontrino PRENOTAZIONE — 2 copie)

### 3. Aggiorna prenotazione

```
PATCH /api/tierra/reservations/{id}
Headers: X-Tierra-Token: tierra2024
```

**Body** (tutti opzionali):
```json
{
  "date": "2026-04-21",
  "time": "19:30",
  "guests": 6,
  "zone": "interno",
  "table_code": "I3",
  "status": "arrived",
  "notes": "Aggiornato: niente torta"
}
```

**Comportamento:**
- Se cambi `date`/`time`/`guests`/`zone` → **ricontrolla la capienza** (può restituire 409)
- Se transizione `status → confirmed` → **invia email + accoda stampa** (idempotente: se era già confermata non duplica)
- Il soft-cancel usa DELETE (vedi sotto)

### 4. Cancella prenotazione (libera slot)

```
DELETE /api/tierra/reservations/{id}
Headers: X-Tierra-Token: tierra2024
```

Marca la prenotazione come `cancelled`. Libera i posti per quella fascia — altre prenotazioni in coda possono entrare.

---

## ⚙️ Admin: Configurare le capienze

Il gestore può modificare la configurazione delle fasce orarie da pannello admin.

### GET configurazione corrente
```
GET /api/admin/slots/config
Headers: Authorization: Bearer <admin-jwt>
```

### PUT aggiornamento
```
PUT /api/admin/slots/config
Headers: Authorization: Bearer <admin-jwt>

{
  "slot_minutes": 90,
  "max_guests_per_slot": 20,
  "max_per_zone": {"interno": 12, "esterno": 8}
}
```

---

## 🔔 Pattern di uso consigliato in Tierra OS

### A. Form "Nuova prenotazione" con feedback live

```
1. Operatore seleziona data + ora
2. Tierra OS chiama GET /availability?date=X&time=Y&guests=0
3. UI mostra: "Slot 20:00-21:00 · 6/16 posti · 10 rimasti"
4. Operatore digita coperti → ricontrolla
5. Badge colorato:
   - Verde "Disponibile" se can_fit=true
   - Giallo "Solo in zona interno (esterno saturo)" se zona specifica piena
   - Rosso "SATURO — fascia successiva disponibile" se saturated=true
6. Se OK: submit a POST /tierra/reservations
```

### B. Spostamento prenotazione esistente

```
1. Cliente chiama: "posso anticipare a stasera 19:00?"
2. Tierra OS: GET /availability?date=oggi&time=19:00&guests=<existing_guests>
3. Se ok: PATCH /tierra/reservations/{id} {"time":"19:00"}
   - Il backend ricontrolla automaticamente la fascia nuova
   - Se saturo → 409, altrimenti applica
```

### C. Lista "oggi" con stato pieno

```
GET /api/tables?include_reservations=true
→ Vedi per ogni tavolo quali prenotazioni ci sono oggi.
```

---

## 📊 Workflow completo integrato

```
🌐 SITO PUBBLICO (cliente)
   POST /api/reservations
   → status: pending
   → 409 se slot saturo
   → nessuna email / stampa

👨‍💼 ADMIN DASHBOARD
   GET /api/admin/reservations
   → vede tutte le richieste
   Click "Conferma & stampa":
   POST /api/admin/reservations/{id}/status?status=confirmed
   → ricontrolla capienza
   → email cliente + stampa cassa

📱 TIERRA OS (operatore Lark)
   POST /api/tierra/reservations
   → status: confirmed by default
   → email + stampa immediate
   PATCH /api/tierra/reservations/{id}
   → aggiorna con capacity check
   DELETE /api/tierra/reservations/{id}
   → libera lo slot

🍽️ SALA (cameriere da Tierra OS)
   PATCH /api/tables/{code}  → libero/confermato/arrivato
   POST /api/orders (service_type: "tavolo", table_code: "E1")
   → stampa CUCINA + CASSA
   POST /api/tables/{code}/close → incasso
```

---

## 🧪 Test rapidi da curl

```bash
BASE="https://tierra-bistro-menu.preview.emergentagent.com"
TK="tierra2024"
TOMORROW=$(date -u -d "+1 day" +%Y-%m-%d)

# 1. Check slot
curl -s "$BASE/api/reservations/availability?date=$TOMORROW&time=20:15&guests=4"

# 2. Create confirmed
curl -s -X POST "$BASE/api/tierra/reservations" \
  -H "Content-Type: application/json" -H "X-Tierra-Token: $TK" \
  -d "{\"customer_name\":\"Test\",\"customer_phone\":\"+39\",\"date\":\"$TOMORROW\",\"time\":\"20:15\",\"guests\":4,\"zone\":\"esterno\"}"

# 3. Update (sposta a 19:30)
curl -s -X PATCH "$BASE/api/tierra/reservations/{id}" \
  -H "Content-Type: application/json" -H "X-Tierra-Token: $TK" \
  -d '{"time":"19:30"}'

# 4. Cancel
curl -s -X DELETE "$BASE/api/tierra/reservations/{id}" -H "X-Tierra-Token: $TK"
```

---

## ⚠️ Error codes

| HTTP | Significato |
|---|---|
| 200 | OK (update/cancel) |
| 201/200 | Creata |
| 400 | Input non valido (guests<1 o >20, nessun campo) |
| 401 | Token mancante/errato |
| 404 | Prenotazione non trovata |
| **409** | **Slot saturo** — vedi `detail.availability` per info remaining |
| 500 | Errore server |

---

## 🎯 Note importanti

- Il **doppio print** (cassa + cliente) funziona sia per ordini al tavolo che per prenotazioni
- Il `source` sulla prenotazione (`website` / `tierra_os` / `admin`) è utile per reportistica
- Le prenotazioni create da Tierra OS sono auto-confermate, quelle da sito web no (richiede click admin)
- La capacity check considera anche le `pending` per evitare overbooking durante il delay admin
- Se vuoi permettere overbooking controllato: imposta `max_per_zone` più alto del reale
