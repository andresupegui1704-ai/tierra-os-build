# Tierra Organic Bistro — PRD

## Original Problem Statement (Italian)
> Vorrei un sito professionale per "Tierra Organic Bistro", che puoi cercare su Google. Eeh, si trova a via Tirso 34, e che sia buono per landing page che per fare, eeh, un menù che possa essere venduto con delivery o asporto o anche prenotazione per mangiare sul posto come preordine. Eeh, che metta in evidenza tutti i pro di "Tierra-" con una grafica accattivante inerente al mondo organico.

## User Choices
- Menu imported from https://www.leggimenu.it/menu/tierraorganicbistrot (28 piatti, 6 categorie)
- Admin può spegnere/accendere disponibilità piatti + modificare prezzi
- Pagamenti: Stripe (test mode tramite `sk_test_emergent`) — PayPal differito
- Prenotazioni con conferma email (Resend) — API key da inserire
- Contatti: WhatsApp `+39 347 991 5420`, email `tierraorganicbistrot@gmail.com`
- Chatbot WhatsApp + promozioni giornaliere: **deferred to Phase 2** (richiede Twilio + numero Meta approvato). In Fase 1: bottone "Chatta su WhatsApp" ben visibile.

## Architecture
- **Frontend**: React 19 + Tailwind + Shadcn UI + Framer Motion. Italian-first.
- **Backend**: FastAPI + Motor/MongoDB. All routes under `/api`.
- **Payments**: `emergentintegrations` for Stripe Checkout (create), raw `stripe` SDK for session retrieval (library Pydantic bug on metadata; also handles race with emergent proxy indexing).
- **Email**: Resend via `resend` SDK, run via `asyncio.to_thread`. Graceful degradation when `RESEND_API_KEY=re_test_placeholder` (logs instead of sends).
- **Auth**: JWT bearer (7d), admin creds from env (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
- **MongoDB collections**: `categories`, `menu_items`, `orders`, `reservations`, `payment_transactions`. All responses exclude `_id`.

## Implementation Status (Phase 1 — 2026-04-18)

### Landing (`/`)
Editorial hero ("La terra nel piatto, con grazia."), brand story, 3 pillars, featured dishes (API-driven), dual-image CTA block, map/contact section. Cormorant Garamond + Manrope typography.

### Menu (`/menu`)
Category tabs (sticky), 28 items grid, availability state (greyed + "Esaurito"), add-to-cart → drawer opens.

### Cart Drawer
Service type toggle (delivery / asporto / preordine), qty +/-, remove, subtotal/delivery fee/total, checkout CTA.

### Checkout (`/checkout`)
Service selector, customer form, delivery address (conditional), scheduled time, notes. Server-side price recomputation. → Stripe redirect.

### Order Success (`/ordine/successo`)
Polls `/api/payments/status/{session_id}` every 2s (max 10 tries). Displays receipt when paid.

### Reservations (`/prenota`)
Shadcn Calendar + Select (time slots + guests 1–14). Success screen on submit. Admin notification + user confirmation emails.

### Admin (`/admin`)
Login → Dashboard with tabs: **Menù** (Switch disponibilità + inline price edit + CRUD + Special del Giorno + toggle per ingrediente), **Ordini** (badge consenso marketing), **Prenotazioni**, **Statistiche** (KPI + ranking piatti + export CSV, filtri Oggi/7g/30g/Mese/Mese scorso/Sempre), **Marketing** (iscritti opt-in + disiscrizione + export CSV), **Stampante**.

### Google Review CTA (added 2026-04-18)
Componente `ReviewCTA` riutilizzabile (`ReviewCTACard` + `ReviewCTABanner`). Link: `https://share.google/eVhM03mToB5eMlaWw`. Presente in:
- Menu top (banner compatto, sempre visibile)
- Menu bottom (card piena)
- Landing prima del footer (card piena)
- Order success (card piena, **solo al primo ordine** — detected via `localStorage.tierra_reviewed_emails`)

### Marketing consent (GDPR opt-in, added 2026-04-18)
Checkbox discreto nel Checkout: "Voglio ricevere offerte, menù del giorno e novità via email/WhatsApp". Salvato su `orders.marketing_consent` + `orders.consent_date`. Upsert su collection `marketing_subscribers` (email as key, orders_count incrementato, active flag).

### Sales statistics (added 2026-04-18)
Endpoint `GET /api/admin/stats/sales?start=&end=` — aggrega quantità e ricavato per piatto sugli ordini con `payment_status=paid`. Ritorna totali (orders, revenue, avg_ticket) + array items ordinato per quantità desc.
Endpoint `GET /api/admin/marketing/subscribers` + `DELETE /api/admin/marketing/subscribers/{email}`.

### Webhook integration (Tierra OS ↔ Lark Base, added 2026-04-19)
Endpoint `POST /api/webhooks/menu/availability` + `/bulk` — auth via `X-Webhook-Token` header (env `WEBHOOK_SECRET`). Endpoint alternativo `PATCH /api/menu/availability` auth via `X-Tierra-Token` (env `TIERRA_TOKEN`, default `tierra2024`). Accetta match by `item_id` o `item_name` (case-insensitive). Frontend menu page polla ogni 20s quando la tab è attiva → latenza end-to-end ~25-30s max. Guida completa in `/app/memory/TIERRA_OS_INTEGRATION.md`.

### Tables / Dine-in orders (added 2026-04-19)
16 tavoli seedati automaticamente (I1-I8 interni + E1-E8 esterni, 2 coperti ciascuno) matching Tierra OS `tierra-mappa-v5`. Endpoints:
- `GET /api/tables` (public): lista tavoli con prenotazioni di oggi collegate
- `PATCH /api/tables/{code}`: cambia status (libero/confermato/arrivato/accorpato/cancellato/occupato), merged_with, capacity
- `POST /api/orders` con `service_type: "tavolo"`: skip Stripe, auto-queue print
- `GET /api/tables/{code}/orders`: ordini aperti del tavolo
- `POST /api/tables/{code}/close`: marca ordini completed + tavolo libero
Reservations estese con `table_code` opzionale. Dual-print implementato in `escpos.py` via `encode_job(mode="kitchen+cashier")`: KITCHEN ticket (no prezzi, font XL, note in evidenza) + CASHIER ticket (full receipt con prezzi, "DA RISCUOTERE" per tavolo). Guida completa in `/app/memory/TIERRA_OS_TABLES_API.md`.

## Test Credentials
In `/app/memory/test_credentials.md`

## Testing
- 27/27 backend pytest pass (`/app/backend/tests/backend_test.py`)
- Frontend flows verified by `testing_agent_v3` iteration 1
- Stats/marketing endpoints smoke-tested via curl (2026-04-18)

## Prioritized Backlog (Phase 2+)
- **P0** Real Resend API key from user → activate transactional emails
- **P0** Sunmi printer IP from user → activate receipt printing
- **P1** WhatsApp chatbot + promo giornaliere via Twilio (invio promo ai `marketing_subscribers` attivi)
- **P1** PayPal integration (Client ID)
- **P2** Refactor `server.py` (>700 lines) in FastAPI routers
- **P3** Multi-language toggle (IT/EN)
- **P3** Loyalty program (punti Tierra)
