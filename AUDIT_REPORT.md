# 🌿 Tierra Organic Bistrot — Site Audit Report
**Generato**: Maggio 2026
**Owner**: Andres · Via Tirso 34, Roma
**Preview URL**: https://tierra-bistro-menu.preview.emergentagent.com

---

## 1. Stato Generale

**Phase 1 (Landing + Menu + Ordini + Prenotazioni)**: ✅ Completata
**Phase 2 (Design editoriale Hoxton/Soho + SEO/LLMO)**: ✅ Completata
**Phase 3 (Integrazione Tierra OS + WhatsApp + Blog)**: 🟡 In corso

Production-ready: **~85%**. Mancano solo configurazioni esterne (dominio, Stripe live, email key).

---

## 2. Architettura

### Stack
- **Frontend**: React 19 + Tailwind + Shadcn UI + Framer Motion · Fonts: Fraunces, Cormorant Garamond, Manrope
- **Backend**: FastAPI + Motor (MongoDB async) · 63 API endpoints sotto `/api`
- **DB**: MongoDB Atlas-style (collections: `menu_items`, `categories`, `orders`, `reservations`, `tables`, `payment_transactions`, `marketing_optin`)
- **Auth**: JWT bearer (admin) + token statico (Tierra OS sync)
- **Pagamenti**: Stripe (currently test mode, ready for live)
- **Email**: Resend SDK (graceful fallback se key non configurata)
- **Stampa**: ESC/POS Sunmi Cloud Printer (agente locale Python)

### Pagine pubbliche (7)
| Route | Scopo |
|---|---|
| `/` | Landing editoriale, hero, brand story, mappa |
| `/menu` | Menu con 5 categorie, customization, add-to-cart |
| `/checkout` | Form ordine + Stripe redirect |
| `/ordine/successo` | Polling pagamento + ricevuta |
| `/prenota` | Calendario + slot + zona + conferma |
| `/admin` | Login (JWT) |
| `/admin/dashboard` | Menù / Ordini / Prenotazioni / Stats / Marketing / Stampante |

---

## 3. Menu Status

**Totale**: 73 piatti · 5 categorie

| Categoria | Items |
|---|---|
| Colazione | 17 |
| Bowls & Lunch | 3 (con customization complessa) |
| Piatti del Giorno | 5 |
| Aperitierra | 29 |
| Caffetteria & Drinks | 19 |

**Immagini**: 100% coperture (illustrazioni acquerello + 5 immagini user-uploaded per vini/birre/aperitivo).

**Customization avanzata** (Bowls):
- Base (Riso Bianco/Integrale/Venere/Couscous) — incluso
- Proteina (4 carne €2 · 8 pesce €3 · 4 hummus €2) — single select obbligatorio
- Extra (Avocado/Focaccia) — multi select
- Cascade: se finisce l'unica proteina disponibile → bowl `available=false` automatico

---

## 4. Funzionalità Implementate

### Frontend (cliente)
- ✅ Landing editoriale con masthead magazine
- ✅ Menu tabs categorie + filtro disponibilità
- ✅ Drawer carrello con quantità/rimozione
- ✅ Checkout con tipo servizio (delivery/asporto/preordine)
- ✅ Prenotazioni con calendario + zona (interno/esterno)
- ✅ Polling post-pagamento con receipt
- ✅ Google Review CTA (mostra solo al primo ordine)
- ✅ Cookie banner GDPR
- ✅ Marketing opt-in con unsubscribe

### Admin Dashboard
- ✅ Login JWT 7d
- ✅ Menù: toggle disponibilità + edit prezzi + CRUD + Special del Giorno + toggle ingredienti
- ✅ Ordini: lista + status + consenso marketing badge
- ✅ Prenotazioni: lista + conferma/cancella
- ✅ Statistiche: KPI + ranking + filtri temporali + export CSV
- ✅ Marketing: iscritti opt-in + export
- ✅ Stampante: configurazione + test stampa

### Integrazioni
- ✅ **Stripe**: Checkout Sessions (test mode), retrieve via stripe SDK, race-safe polling
- ✅ **Resend**: email conferma ordini + prenotazioni + admin notification (graceful fallback)
- ✅ **Tierra OS sync (bidirezionale)**:
  - Push outgoing: ordini/reservation → Lark Base (auto-store recordId)
  - Pull endpoints: `/tierra/sync-snapshot`, `/tierra/orders`, `/tierra/sync/replay`
  - Toggle globale: `/tierra/options/availability` (cascade)
  - Sync ingredienti modulari: `/tierra/ingredients/sync` (Lark `Ingredienti` → site, 17 ingredient_id mappati)
  - Idempotency-Key TTL 24h
- ✅ **Stampante Sunmi**: ESC/POS agent locale + endpoint comando

### SEO / LLMO
- ✅ React Helmet Async (meta dinamici per pagina)
- ✅ JSON-LD Schema.org: Restaurant, Menu, MenuItem, BreadcrumbList, FAQ
- ✅ Sitemap.xml + robots.txt
- ✅ Open Graph + Twitter Card
- ✅ Press section ("Riconoscimenti")
- ✅ Semantic HTML (h1/h2 gerarchici, dl/dt/dd per orari)

---

## 5. Design & UX

**Stile**: Editoriale "Hoxton/Soho House" — magazine masthead, generous whitespace, asymmetric layouts, italic accents.

**Tipografia**:
- H1: Fraunces (serif)
- Body: Manrope (sans)
- Decorative: Cormorant Garamond (italic)

**Componenti firmati**:
- `MagazineMasthead`, `EditorialHero`, `ChefDiary`, `PressSection`, `MenuRow` (dotted leader pricing)
- `data-testid` su tutti gli elementi interattivi

---

## 6. Cosa Manca per Go-Live (10%)

### 🔴 Blocchi critici (richiedono input utente)
1. **Dominio** `tierraorganic.it` — DNS CNAME → preview URL
2. **Stripe LIVE keys** (`sk_live_*` + `pk_live_*`)
3. **Resend API key** (gratis fino a 100 email/giorno)

### 🟡 Allineamento con Tierra OS team (Raul)
4. URL Netlify produzione OS + token UUID per push outgoing
5. Riconciliare 5 discrepanze naming ingredienti (Riso Nero vs Venere, Hummus Ceci non esiste sul sito, ecc.)

### 🟢 Nice-to-have
6. Twilio WhatsApp Business (chatbot automatico)
7. Blog SEO (6 articoli pianificati)
8. PayPal checkout
9. Sunmi printer live test

---

## 7. Aree di Possibile Miglioramento

### Tecniche
- `server.py` è ~2000 righe — refactor in router separati (`routes/orders.py`, `routes/reservations.py`, ecc.)
- Nessun rate limiting sugli endpoint pubblici (cart abuse)
- Nessuna queue per Tierra OS sync (attualmente fire-and-forget)

### UX
- Manca multi-lingua (solo IT; valutare EN per turisti zona Termini)
- Manca filtro allergeni nel menu (G/L/E/N/F/S sono mostrati ma non filtrabili)
- Manca "Aggiungi note" sull'item nel carrello (solo nota ordine globale)

### Business
- No loyalty program / punti
- No newsletter automatica (solo opt-in passivo)
- No upsell in checkout ("aggiungi caffè +€1.50")

---

## 8. Sicurezza & Compliance

- ✅ JWT auth admin
- ✅ Token statico per Tierra OS (configurabile via env)
- ✅ Server-side price recomputation (anti-tampering)
- ✅ CORS configurato
- ✅ Cookie banner GDPR
- ⚠️ Manca rate limiting
- ⚠️ Manca CAPTCHA su prenotazioni (anti-bot)
- ⚠️ Stripe webhook signature verification: da abilitare in live mode

---

## 9. Performance

- React build via CRACO (non Vite — possibile upgrade futuro)
- Immagini servite da CDN Emergent (no lazy-load custom)
- Backend single-process FastAPI (sufficiente per <1000 ordini/giorno)
- MongoDB indices: presenti su `category_slug`, `available`, `service_type`

---

## 10. Domande per Review Esterna

Cose interessanti da chiedere all'AI:
1. *"Il design Hoxton/Soho è coerente sull'intera UX?"*
2. *"Lo Schema.org JSON-LD è completo per essere visibile nei risultati AI (Perplexity, Google AI Overview)?"*
3. *"Quali quick-win UX possono aumentare conversion checkout?"*
4. *"L'architettura backend è scalabile a 5-10 location franchise?"*
5. *"Mancano feature critiche per un bistrò moderno (Toast/Square benchmark)?"*

---

## Crediti
- **Owner**: Andres Capponi
- **Backend & integrations**: Emergent Agent (E1)
- **POS/OS partner**: Raul (Claude Opus) su `ostierra.netlify.app`
- **Design system**: Hoxton/Soho House editorial vibe
