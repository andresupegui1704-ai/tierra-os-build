# 🪑 Tierra OS — API Integration: Sala, Tavoli & Ordini

Questa guida documenta tutti gli endpoint che **Tierra OS** deve chiamare per gestire la sala, lo stato dei tavoli e gli ordini presi dai camerieri direttamente al tavolo.

---

## 🔐 Autenticazione

Tutte le API di scrittura (PATCH/POST) richiedono l'header:

```
X-Tierra-Token: tierra2024
```

> ⚠️ **Produzione**: sostituire con un token più robusto impostando la env `TIERRA_TOKEN` su `/app/backend/.env` e riavviando il backend.

**URL base:** `https://tierra-bistro-menu.preview.emergentagent.com`

---

## 🗺️ Schema tavoli (seed iniziale)

All'avvio sono creati automaticamente **16 tavoli** corrispondenti alla disposizione mostrata nell'app `tierra-mappa-v5`:

| Zona | Codici | Capacità |
|---|---|---|
| **Interno** (`interno`) | I1, I2, I3, I4, I5, I6, I7, I8 | 2 coperti ciascuno |
| **Esterno / Dehors** (`esterno`) | E1, E2, E3, E4, E5, E6, E7, E8 | 2 coperti ciascuno |

Ogni tavolo ha un campo `status` che segue esattamente la legenda della vostra pianta:

| Status | Colore Tierra OS | Significato |
|---|---|---|
| `libero` | grigio | disponibile |
| `confermato` | arancione | prenotazione confermata |
| `arrivato` | verde | cliente al tavolo, ordine aperto |
| `accorpato` | giallo | due tavoli uniti (campo `merged_with`) |
| `occupato` | — | generico "occupato senza prenotazione" |
| `cancellato` | rosso | prenotazione annullata |

---

## 📡 Endpoint disponibili

### 1. `GET /api/tables` — Lista tavoli
**Pubblico** (no auth). Legge lo stato di tutti i tavoli in tempo reale.

**Query params:**
- `zone` *(opzionale)*: `interno` | `esterno` — filtra per zona
- `include_reservations` *(default: true)*: include prenotazioni di oggi collegate

**Esempio:**
```bash
curl https://tierra-bistro-menu.preview.emergentagent.com/api/tables?zone=esterno
```

**Risposta:**
```json
[
  {
    "id": "uuid",
    "code": "E1",
    "zone": "esterno",
    "capacity": 2,
    "status": "confermato",
    "merged_with": [],
    "updated_at": "2026-04-19T12:00:00+00:00",
    "reservations_today": [
      {
        "id": "res-uuid",
        "customer_name": "Verdi",
        "time": "12:45",
        "guests": 2,
        "status": "confirmed"
      }
    ]
  }
]
```

---

### 2. `PATCH /api/tables/{code}` — Aggiorna stato tavolo
🔐 **Auth richiesta**: `X-Tierra-Token`

**Body:**
```json
{
  "status": "arrivato",
  "merged_with": [],
  "capacity": 2,
  "label": "Sotto la pergola"
}
```

Tutti i campi sono opzionali — passa solo quelli che vuoi aggiornare.

**Esempio — cliente arrivato al tavolo E1:**
```bash
curl -X PATCH https://tierra-bistro-menu.preview.emergentagent.com/api/tables/E1 \
  -H "X-Tierra-Token: tierra2024" \
  -H "Content-Type: application/json" \
  -d '{"status":"arrivato"}'
```

**Esempio — accorpa E3 e E4:**
```bash
# Primo: aggiorna E3
curl -X PATCH .../api/tables/E3 \
  -H "X-Tierra-Token: tierra2024" \
  -H "Content-Type: application/json" \
  -d '{"status":"accorpato","merged_with":["E4"],"capacity":4}'

# Secondo: aggiorna E4
curl -X PATCH .../api/tables/E4 \
  -H "X-Tierra-Token: tierra2024" \
  -H "Content-Type: application/json" \
  -d '{"status":"accorpato","merged_with":["E3"]}'
```

---

### 3. `POST /api/orders` — Crea ordine al tavolo
Lo stesso endpoint degli ordini online, ma con `service_type: "tavolo"`. Il backend:
- **Salta il pagamento online** (`payment_status: "not_required"`)
- **Accoda automaticamente** la stampa (kitchen + cashier ticket)
- Marca l'ordine `status: "open"` finché non chiudi il tavolo

**Body minimo per ordine al tavolo:**
```json
{
  "service_type": "tavolo",
  "items": [
    {
      "item_id": "9ad49951-a375-4f5e-9105-c89bb052de2a",
      "name": "Poke Media Bowl",
      "price": 13,
      "quantity": 2,
      "customizations": [
        {
          "group_name": "Base di carboidrati",
          "option_names": ["Riso Venere"],
          "price_delta": 0
        },
        {
          "group_name": "Proteina",
          "option_names": ["Pastrami di Salmone"],
          "price_delta": 3
        }
      ]
    }
  ],
  "customer_name": "Tavolo E1 - Verdi",
  "customer_phone": "-",
  "origin_url": "tierra-os",
  "table_code": "E1",
  "waiter": "Marco",
  "notes": "Senza glutine per un commensale"
}
```

**Risposta:** oggetto `Order` completo (vedi schema in `models.py`).

---

### 4. `GET /api/tables/{code}/orders` — Ordini aperti di un tavolo
**Pubblico**. Utile per mostrare al cameriere quanto hanno già ordinato prima di aggiungere altro.

**Query params:**
- `open_only` *(default: true)*: mostra solo ordini `open`, `preparing`, `ready`

**Esempio — vedi il conto aperto del tavolo E1:**
```bash
curl https://tierra-bistro-menu.preview.emergentagent.com/api/tables/E1/orders
```

---

### 5. `POST /api/tables/{code}/close` — Chiudi tavolo (pagamento)
🔐 **Auth richiesta**: `X-Tierra-Token`

Da chiamare quando il cameriere incassa. Marca:
- Tutti gli ordini aperti del tavolo come `status: "completed"`, `payment_status: "paid"`
- Il tavolo come `status: "libero"`, `merged_with: []`

```bash
curl -X POST https://tierra-bistro-menu.preview.emergentagent.com/api/tables/E1/close \
  -H "X-Tierra-Token: tierra2024"
```

---

### 6. `GET /api/tables/{code}` — Dettaglio singolo tavolo

```bash
curl https://tierra-bistro-menu.preview.emergentagent.com/api/tables/E1
```

---

## 🖨️ Doppia stampa Cucina + Cassa

Ogni ordine al tavolo genera **automaticamente** 2 scontrini diversi, inviati in sequenza alla stampante Sunmi:

### 📋 Scontrino 1 — **CUCINA**
- Intestazione grande: `CUCINA` + `TAVOLO E1`
- **Nessun prezzo** (non distrarre i cuochi)
- Piatti in font **doppia altezza + grassetto** (visibilità da lontano)
- Personalizzazioni indentate (es. `> Base: Riso Venere`)
- **Note allergie in evidenza** (font grande + bold)
- Timestamp, nome cameriere, ID ordine

### 🧾 Scontrino 2 — **CASSA**
- Intestazione: `CASSA` + brand completo (Tierra Organic Bistrot)
- Dettaglio prezzi per piatto + personalizzazioni
- Subtotale, totale
- Stato pagamento: `*** DA RISCUOTERE ***` (per ordini al tavolo)
- Info contatto cliente, tavolo, cameriere, note

Se la stampante è una sola, escono entrambi di seguito con taglio automatico tra l'uno e l'altro.

---

## 🔄 Flusso tipico giornaliero

```
1. MATTINA
   Tierra OS: team imposta availability piatti → PATCH /api/menu/availability
   Sito cliente: vede solo i piatti disponibili entro 20s

2. PRENOTAZIONE ARRIVA
   Cliente prenota da /prenota → POST /api/reservations
   Tierra OS: mostra prenotazione non assegnata
   Team assegna tavolo: PATCH /api/reservations/{id} (se implementato)
       o: prenota direttamente da Tierra OS includendo table_code

3. PRANZO
   Cliente arriva → PATCH /api/tables/E1 {"status":"arrivato"}
   Cameriere prende ordine al tavolo da Tierra OS
   Invia: POST /api/orders (service_type: "tavolo", table_code: "E1")
   → Stampa automatica: 1 in CUCINA + 1 in CASSA

4. ORDINI AGGIUNTIVI
   Se il cliente aggiunge (caffè, dolci): nuova POST /api/orders per stesso table_code
   Ogni volta stampa kitchen+cashier

5. CONTO
   Cliente paga → POST /api/tables/E1/close
   Tutti gli ordini del tavolo → status "completed"
   Tavolo → "libero"

6. SERA
   GET /api/admin/stats/sales (con auth admin)
   → report piatti venduti, incasso, scontrino medio
```

---

## 📊 Schema completo dei modelli

### `Order` con `service_type: "tavolo"`
```json
{
  "id": "uuid",
  "service_type": "tavolo",
  "table_code": "E1",
  "waiter": "Marco",
  "items": [ ... ],
  "customer_name": "Tavolo E1 - Verdi",
  "customer_phone": "-",
  "customer_email": null,
  "subtotal": 30.0,
  "total": 30.0,
  "status": "open",
  "payment_status": "not_required",
  "notes": "Senza glutine",
  "created_at": "..."
}
```

### `Table`
```json
{
  "id": "uuid",
  "code": "E1",
  "zone": "esterno",
  "capacity": 2,
  "status": "arrivato",
  "merged_with": [],
  "label": null,
  "position": null,
  "order": 1,
  "updated_at": "..."
}
```

### `Reservation` (con tavolo)
```json
{
  "id": "uuid",
  "customer_name": "Verdi",
  "date": "2026-04-19",
  "time": "12:45",
  "guests": 2,
  "status": "confirmed",
  "table_code": "E1"
}
```

---

## 🧪 Test rapido da curl

```bash
BASE="https://tierra-bistro-menu.preview.emergentagent.com"
TK="tierra2024"

# 1. Libero tutti i tavoli
for code in I1 I2 I3 I4 I5 I6 I7 I8 E1 E2 E3 E4 E5 E6 E7 E8; do
  curl -s -X PATCH "$BASE/api/tables/$code" \
    -H "X-Tierra-Token: $TK" -H "Content-Type: application/json" \
    -d '{"status":"libero"}' > /dev/null
done
echo "Tutti i tavoli liberati."

# 2. Lista tavoli
curl -s "$BASE/api/tables" | jq '.[] | {code, status, reservations_today: .reservations_today|length}'
```
