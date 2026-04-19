# 🔌 Integrazione Tierra OS — Kit Completo

Questo pacchetto contiene tutto il necessario per integrare **Tierra OS** (tierra-os.netlify.app) con il sito Tierra. Due strade:

- **🅰️ Strada A — SDK JavaScript** (consigliata per app Netlify custom): importi una libreria e chiami funzioni pulite. Vedi `tierraApi.js`.
- **🅱️ Strada B — Lark Base Automations** (consigliata per trigger automatici da tabella): configuri "Send HTTP Request" con body JSON pronti. Vedi sotto.

Puoi usarle entrambe insieme.

---

## 🔐 Credenziali (hardcoded per MVP, da cambiare in produzione)

| Parametro | Valore |
|---|---|
| **Base URL** | `https://tierra-bistro-menu.preview.emergentagent.com` |
| **Header auth** | `X-Tierra-Token: tierra2024` |

Quando andrai live con un dominio tuo (`tierraorganic.it`) cambi solo la Base URL e basta. Il token lo puoi cambiare in `/app/backend/.env` → `TIERRA_TOKEN=<nuovo-valore-random>` e aggiornare qui.

---

# 🅰️ STRADA A — SDK JavaScript

## Setup in 3 passi

1. Copia il file `/app/integrations/tierra_os/tierraApi.js` nel tuo progetto Netlify Tierra OS sotto `src/lib/tierraApi.js`
2. Importa solo le funzioni che ti servono:
   ```js
   import { listTables, updateTable, createReservation } from "./lib/tierraApi";
   ```
3. Chiama. Fine. Tutti gli errori sono già gestiti con status code HTTP standard (401, 404, 409, ...).

## Quick reference

```js
// MENU
setDishAvailability({ name: "Avocado Toast", available: false });
setDishAvailabilityBulk([{ name: "Poke", available: true }, { name: "Ceviche", available: false }]);

// PRENOTAZIONI
checkAvailability({ date: "2026-04-21", time: "20:00", guests: 4, zone: "esterno" });
createReservation({ customer_name: "Rossi", customer_phone: "+39...", date: "...", time: "...", guests: 4 });
updateReservation(resId, { time: "19:30", guests: 5 });
cancelReservation(resId);

// SALA
listTables({ zone: "esterno" });
updateTable("E1", { status: "arrivato" });
closeTable("E1");

// ORDINI AL TAVOLO
createTableOrder({ table_code: "E1", waiter: "Marco", items: [...] });
```

## Esempi completi
Vedi il file `tierraApi.js` — la parte in fondo contiene 4 snippet reali copia-incolla (sync mattutino menu, form prenotazione con feedback live, ordine cameriere, gestione piantina real-time).

---

# 🅱️ STRADA B — Lark Base Automations

Configura queste automation nel tuo Lark Base per trigger automatici.

---

## 🍽️ Automation 1 — Sync disponibilità piatti

**Trigger:** *When record is updated* sulla tabella `Piatti`, colonna `Disponibile`.

**Action:** *Send HTTP Request*

| Campo | Valore |
|---|---|
| Method | `PATCH` |
| URL | `https://tierra-bistro-menu.preview.emergentagent.com/api/menu/availability` |
| Headers | `Content-Type: application/json`<br>`X-Tierra-Token: tierra2024` |

**Body (JSON):**
```json
{
  "items": [
    {
      "name": "{{Record.Nome}}",
      "available": {{Record.Disponibile}}
    }
  ]
}
```

> 💡 Se hai salvato anche l'UUID del piatto come colonna `external_id`, usa `"id": "{{Record.external_id}}"` invece di `"name"` — è più affidabile.

---

## 📅 Automation 2 — Crea prenotazione da Tierra OS

**Trigger:** *When record is created* sulla tabella `Prenotazioni`.

**Action:** *Send HTTP Request*

| Campo | Valore |
|---|---|
| Method | `POST` |
| URL | `https://tierra-bistro-menu.preview.emergentagent.com/api/tierra/reservations` |
| Headers | `Content-Type: application/json`<br>`X-Tierra-Token: tierra2024` |

**Body (JSON):**
```json
{
  "customer_name": "{{Record.Cliente}}",
  "customer_phone": "{{Record.Telefono}}",
  "customer_email": "{{Record.Email}}",
  "date": "{{Record.Data}}",
  "time": "{{Record.Ora}}",
  "guests": {{Record.Coperti}},
  "zone": "{{Record.Zona}}",
  "table_code": "{{Record.Tavolo}}",
  "notes": "{{Record.Note}}",
  "status": "confirmed",
  "auto_print": true
}
```

**Dopo la action**: salva la response in un campo `external_id` (l'`id` UUID restituito) — ti servirà per update/cancel futuri.

> ⚠️ Se la fascia è satura, Lark Base riceverà **HTTP 409** con un messaggio in italiano da mostrare all'operatore nel popup.

---

## ✏️ Automation 3 — Aggiorna prenotazione

**Trigger:** *When record is updated* sulla tabella `Prenotazioni`, colonne `Data`, `Ora`, `Coperti`, `Zona`, `Tavolo`, `Status`, `Note`.

**Action:** *Send HTTP Request*

| Campo | Valore |
|---|---|
| Method | `PATCH` |
| URL | `https://tierra-bistro-menu.preview.emergentagent.com/api/tierra/reservations/{{Record.external_id}}` |
| Headers | `Content-Type: application/json`<br>`X-Tierra-Token: tierra2024` |

**Body (JSON):**
```json
{
  "date": "{{Record.Data}}",
  "time": "{{Record.Ora}}",
  "guests": {{Record.Coperti}},
  "zone": "{{Record.Zona}}",
  "table_code": "{{Record.Tavolo}}",
  "status": "{{Record.Status}}",
  "notes": "{{Record.Note}}"
}
```

---

## 🗑️ Automation 4 — Annulla prenotazione

**Trigger:** *When record is updated*, condizione `Status == "cancelled"` (o quando l'operatore clicca un bottone "Annulla").

**Action:** *Send HTTP Request*

| Campo | Valore |
|---|---|
| Method | `DELETE` |
| URL | `https://tierra-bistro-menu.preview.emergentagent.com/api/tierra/reservations/{{Record.external_id}}` |
| Headers | `X-Tierra-Token: tierra2024` |

Body: **vuoto**.

---

## 🪑 Automation 5 — Cambia stato tavolo

**Trigger:** *When record is updated* sulla tabella `Tavoli`, colonna `Status`.

**Action:** *Send HTTP Request*

| Campo | Valore |
|---|---|
| Method | `PATCH` |
| URL | `https://tierra-bistro-menu.preview.emergentagent.com/api/tables/{{Record.Codice}}` |
| Headers | `Content-Type: application/json`<br>`X-Tierra-Token: tierra2024` |

**Body (JSON):**
```json
{
  "status": "{{Record.Status}}",
  "merged_with": {{Record.Accorpato_con}},
  "capacity": {{Record.Capienza}}
}
```

> I valori validi per `status`: `libero` · `confermato` · `arrivato` · `accorpato` · `cancellato` · `occupato` (case-sensitive).

---

# 📋 CHECKLIST settimana di lancio

## 📅 Lunedì — Dominio
- [ ] Registra `tierraorganic.it` (o simile) su Aruba/OVH/Namecheap (~15€/anno)
- [ ] DNS punta a Emergent (ti passo il record CNAME quando mi confermi il dominio)
- [ ] Attesa propagazione DNS: 2-24h

## 📅 Martedì — Integrazioni esterne
- [ ] **Resend** — crea account su resend.com, API key
- [ ] **Twilio** — crea account twilio.com, accedi al sandbox WhatsApp
- [ ] **Stampante Sunmi** — annota IP del locale (Settings → About → IP Address)
- [ ] **MacBook cassa** — verifica che Python 3 sia installato (`python3 --version`)

## 📅 Mercoledì — Configurazione Tierra OS
- [ ] Copia `tierraApi.js` nel repo Netlify
- [ ] Crea le 5 automation Lark Base di sopra
- [ ] Aggiungi colonna `external_id` alle tabelle Prenotazioni e Piatti
- [ ] Prima sync: esegui manualmente `setDishAvailabilityBulk` per allineare i 28 piatti

## 📅 Giovedì — Test end-to-end
- [ ] Test #1 Ordine online → pagamento Stripe test → email (log) → no stampa (è delivery)
- [ ] Test #2 Prenotazione sito → ricevuta in admin → conferma → email + stampa
- [ ] Test #3 Tierra OS crea prenotazione → stampa automatica
- [ ] Test #4 Tierra OS prende ordine al tavolo → kitchen + cashier tickets
- [ ] Test #5 Tierra OS cambia disponibilità piatto → sparisce dal menu in 20s
- [ ] Test #6 Satura una fascia (4 prenotazioni da 4 coperti, stesso orario) → la quinta viene rifiutata
- [ ] Test #7 Incasso tavolo → stato libero, ordini completati

## 📅 Venerdì — Go-live
- [ ] Cambia chiave Stripe da test a live (ti guido io quando sei pronto)
- [ ] Attiva dominio custom
- [ ] Cambia `WEBHOOK_SECRET` e `TIERRA_TOKEN` a valori robusti (64 char random)
- [ ] Primo cliente reale! 🎉

## 📅 Sabato/Domenica — Monitoring
- [ ] Controlla i log (`tail -f /var/log/supervisor/backend.*.log`)
- [ ] Scarica statistiche CSV fine settimana
- [ ] Raccogli feedback camerieri → iteriamo lunedì

---

# 🌐 Come prendere il dominio

**Opzione consigliata** (più economica):
1. Vai su [Namecheap](https://www.namecheap.com) o [Aruba](https://www.aruba.it)
2. Cerca `tierraorganic.it` — se disponibile, comprali (~15€/anno)
3. Mandami il codice di accesso al DNS management o la schermata di "Advanced DNS"
4. Ti passo io il record **CNAME** da inserire (punterà a Emergent)
5. In 2-24h il sito sarà su `https://tierraorganic.it`

**Alternative più costose ma più semplici**:
- Emergent offre deployment diretto con dominio generato (gratis ma non personalizzato)
- Se preferisci, Squarespace/Wix fanno dominio + hosting insieme (ma perdiamo l'integrazione con l'app)

---

# ❓ Domande frequenti

**D: Se il sito Emergent va giù, Tierra OS si blocca?**
R: Sì perché chiama il nostro backend. Per mitigare: Emergent ha uptime 99.9%. Se vuoi ridondanza serve lo stato C (multi-tenant SaaS su infrastruttura propria).

**D: Posso vedere lo storico delle chiamate API?**
R: Sì, nei log backend. Ogni chiamata autenticata viene tracciata con source. Te lo esporto quando vuoi.

**D: Cosa succede se l'automation Lark Base fallisce?**
R: Lark ha un retry automatico (3 volte). Se falla definitivamente, Lark notifica l'admin della base. Le automation inoltre hanno uno storico — vedi chi ha successo e chi no.

**D: Possiamo fare il test senza toccare i dati reali?**
R: Sì — creo un database separato di "staging" in 10 min quando serve.
