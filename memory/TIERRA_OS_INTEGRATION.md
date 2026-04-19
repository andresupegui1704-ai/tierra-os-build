# 🔗 Integrazione Tierra OS ↔ Sito Tierra (Webhook)

Questa guida spiega come connettere **Tierra OS** (`tierra-os.netlify.app`, basata su Lark Base) al sito pubblico **Tierra** in modo che quando il team attiva/disattiva un piatto dalla mattina, la modifica si rifletta sul sito entro **20 secondi** senza bisogno di refresh manuale.

---

## 🎯 Come funziona

1. Lark Base rileva un cambio sulla colonna "Disponibile" di un piatto
2. Un'automazione Lark Base invia una POST HTTP al webhook del sito
3. Il sito aggiorna MongoDB e segna il piatto come disponibile/esaurito
4. Il menu pubblico (`/menu`) ri-legge i piatti ogni 20 secondi → il cambio appare in tempo quasi-reale

---

## 🔑 Credenziali (da inserire nell'automazione Lark Base)

| Parametro | Valore |
|---|---|
| **URL base** | `https://tierra-bistro-menu.preview.emergentagent.com` *(o il dominio di produzione)* |
| **Webhook secret** | `UqL97fcZz1zah9d9IiwuJx6ESqcNByiU` |
| **Header di autenticazione** | `X-Webhook-Token: UqL97fcZz1zah9d9IiwuJx6ESqcNByiU` |

> ⚠️ **Sicurezza**: questo token va protetto. Se viene compromesso, modificalo in `/app/backend/.env` → `WEBHOOK_SECRET=` e riavvia il backend (`sudo supervisorctl restart backend`), poi aggiorna l'automazione Lark Base.

---

## 📡 Endpoint disponibili

### A. Aggiornamento singolo piatto
**Raccomandato** per trigger "Quando record aggiornato" su Lark Base.

```
POST /api/webhooks/menu/availability
Content-Type: application/json
X-Webhook-Token: <WEBHOOK_SECRET>
```

**Body** (usa **o** `item_id` **o** `item_name` — il nome è case-insensitive):

```json
{
  "item_name": "Avocado Toast",
  "available": true,
  "source": "tierra-os"
}
```

oppure (più affidabile se Lark ha già l'ID):

```json
{
  "item_id": "1c72f3fe-a3c6-449c-948a-b9062814d6ff",
  "available": false,
  "source": "tierra-os"
}
```

**Risposta success (200)**:
```json
{
  "ok": true,
  "item_id": "1c72f3fe-a3c6-449c-948a-b9062814d6ff",
  "name": "Avocado Toast",
  "available": false,
  "matched_by": "name"
}
```

**Errori possibili**:
- `401 Unauthorized` — token mancante o errato
- `400 Bad Request` — manca `available` o manca sia `item_id` che `item_name`
- `404 Not Found` — nessun piatto corrisponde al nome/id fornito

---

### B. Aggiornamento bulk (più piatti in una chiamata)
Utile per sincronizzazioni giornaliere "tutto il menù del giorno".

```
POST /api/webhooks/menu/availability/bulk
Content-Type: application/json
X-Webhook-Token: <WEBHOOK_SECRET>
```

**Body**:
```json
{
  "items": [
    {"item_name": "Avocado Toast", "available": true},
    {"item_name": "Ceviche di salmone", "available": false},
    {"item_name": "Poke Bowl Classico", "available": true}
  ],
  "source": "tierra-os-daily-sync"
}
```

**Risposta**:
```json
{
  "ok": true,
  "updated": 2,
  "not_found": ["Ceviche di salmone"],
  "results": [
    {"id": "uuid-1", "name": "Avocado Toast", "available": true},
    {"id": "uuid-3", "name": "Poke Bowl Classico", "available": true}
  ]
}
```

I piatti in `not_found` non sono stati trovati nel menù (errore di battitura o piatto non ancora seedato). Gli altri vengono aggiornati normalmente.

---

## 🛠️ Setup dell'automazione Lark Base

1. **Apri il tuo Lark Base** → tab "Automation" (o "Automazione")
2. Clicca **"+ New Automation"**
3. **Trigger**:
   - Type: *When a record is updated*
   - Table: la tua tabella piatti
   - Field to watch: `Disponibile` (o il nome della colonna boolean)
4. **Action**:
   - Type: *Send HTTP Request*
   - Method: `POST`
   - URL: `https://tierra-bistro-menu.preview.emergentagent.com/api/webhooks/menu/availability`
   - Headers:
     ```
     Content-Type: application/json
     X-Webhook-Token: UqL97fcZz1zah9d9IiwuJx6ESqcNByiU
     ```
   - Body (JSON, usa i placeholder Lark per i campi):
     ```json
     {
       "item_name": "{{Record.Nome}}",
       "available": {{Record.Disponibile}},
       "source": "tierra-os-lark"
     }
     ```
5. **Test** → salva → attiva

> 💡 **Best practice**: se Lark Base ha già un campo `external_id` (= l'UUID del piatto sul sito), usa `item_id` invece di `item_name` — è più veloce e non dipende dall'ortografia.

---

## 🧪 Test da curl

```bash
# Setta un piatto come esaurito
curl -X POST https://tierra-bistro-menu.preview.emergentagent.com/api/webhooks/menu/availability \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: UqL97fcZz1zah9d9IiwuJx6ESqcNByiU" \
  -d '{"item_name":"Avocado Toast","available":false,"source":"manual-test"}'

# Bulk
curl -X POST https://tierra-bistro-menu.preview.emergentagent.com/api/webhooks/menu/availability/bulk \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: UqL97fcZz1zah9d9IiwuJx6ESqcNByiU" \
  -d '{"items":[{"item_name":"Avocado Toast","available":true},{"item_name":"Pasticceria","available":false}],"source":"manual-test"}'
```

---

## 📊 Come vedere i log

Ogni chiamata al webhook viene loggata nel backend:

```bash
# Dal terminale sul server
tail -f /var/log/supervisor/backend.*.log | grep -i webhook
```

Esempio log:
```
2026-04-19 09:15:23 - server - INFO - Webhook availability update — source=tierra-os matched_by=name item=Avocado Toast → available=False
```

---

## ⏱️ Latenza end-to-end attesa

| Step | Tempo |
|---|---|
| Lark Base rileva il cambio | ~1-5s |
| Automazione invia POST | ~1-2s |
| Il backend aggiorna MongoDB | <100ms |
| Il frontend ri-fetcha il menu (polling ogni 20s) | 0-20s |
| **Totale max** | **~25-30s** dal clic su Tierra OS al cambio visibile sul sito |

Se il cliente è già sulla pagina menu quando l'aggiornamento arriva, vedrà il cambio al prossimo ciclo di polling. Se apre la pagina dopo, la vede subito.

---

## 🚀 Upgrade futuri (opzionali)

- **Server-Sent Events (SSE)**: potrei sostituire il polling con una connessione push → aggiornamento istantaneo (<1s). Serve ~1-2h di lavoro.
- **WebSocket**: idem, ma più complesso. Utile solo se aggiungi chat o notifiche.
- **Firma HMAC**: invece del semplice token, firmare il body con HMAC-SHA256 per impedire replay attacks. Consigliato se il sito va in produzione.

Parlami quando vuoi procedere.
