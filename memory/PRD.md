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
Login → Dashboard with tabs: **Menù** (Switch per disponibilità + inline price edit), **Ordini**, **Prenotazioni**.

## Test Credentials
In `/app/memory/test_credentials.md`

## Testing
- 27/27 backend pytest pass (`/app/backend/tests/backend_test.py`)
- Frontend flows verified by `testing_agent_v3` iteration 1

## Prioritized Backlog (Phase 2+)
- **P0** Real Resend API key from user → activate transactional emails
- **P1** WhatsApp chatbot + daily promos via Twilio (requires numero Meta approvato)
- **P1** PayPal integration (Client ID)
- **P2** Admin: add/edit/delete menu items from UI (currently only toggle + price edit)
- **P2** Admin: upload immagini piatti (object storage)
- **P2** Newsletter form + segmented daily promo email
- **P2** Google Maps embed in contact section
- **P3** Multi-language toggle (IT/EN)
- **P3** Reviews/testimonials section
- **P3** Loyalty program (punti Tierra)
