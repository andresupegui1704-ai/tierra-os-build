# 🏢 Strada C — Multi-Tenant SaaS: Preventivo & Architettura

**Data preventivo:** 18 Aprile 2026
**Progetto base:** Tierra Organic Bistrot
**Target:** trasformare il template attuale in un vero prodotto SaaS dove ogni ristorante ha il suo account, paga un abbonamento mensile, e gestisce il suo sito da solo.

---

## 🎯 Cosa ottieni

### Per te (il venditore / consulente)
- **1 codebase** da mantenere invece di N cloni
- Dashboard super-admin: vedi tutti i clienti, i loro abbonamenti, le loro metriche
- Billing automatico via Stripe (abbonamenti mensili/annuali, upgrade/downgrade, recupero pagamenti falliti)
- Onboarding wizard: nuovo cliente si registra da solo, configura il suo brand in 5 minuti

### Per il cliente (il ristorante)
- Login personale su `admin.tuosito.com`
- Il suo sito pubblico su `nomeristorante.tuosito.com` (o dominio custom `www.nomeristorante.it`)
- Pannello "Brand & Copy": cambia nome, logo, colori, foto, testi senza toccare codice
- Piani Bronze / Silver / Gold con feature gate (es. Gold sblocca WhatsApp broadcast + stampante)
- Fatturazione mensile automatica

---

## 📐 Architettura tecnica

### Modifiche al backend

| Area | Cosa cambia |
|---|---|
| **Database** | Ogni collection (orders, menu_items, reservations, subscribers) ottiene un campo `tenant_id`. Query tutte filtrate per tenant. |
| **Auth** | JWT porta dentro sia `admin_user_id` che `tenant_id`. Middleware di tenant-isolation su ogni endpoint. |
| **Routing** | Middleware FastAPI legge l'host (`nomeristorante.tuosito.com`) → risolve `tenant_id` → passa alle route. |
| **Nuove collection** | `tenants`, `tenant_users`, `subscriptions`, `plans`, `domain_mappings`. |
| **Super-admin API** | `/api/super/tenants`, `/api/super/stats`, ecc. Protette da un ruolo elevato. |
| **Billing** | Webhook Stripe per gestire `invoice.paid`, `customer.subscription.deleted`, ecc. Feature gate basati sul piano attivo. |
| **Storage immagini** | Bucket S3 con path tipo `s3://app/<tenant_id>/brand/logo.png`. |

### Modifiche al frontend

| Area | Cosa cambia |
|---|---|
| **Brand config** | Non più statico in `brand.js`, ma caricato al boot da `/api/brand/current` (in base all'host). |
| **Landing / Menu / Checkout** | Leggono `useBrand()` da React Context invece che importare costanti. |
| **Nuova pagina: `/brand/edit`** | Form admin per modificare brand + copy + colori + logo. Preview live. |
| **Nuova pagina: `/billing`** | Gestione abbonamento (upgrade, downgrade, cancellazione, fatture). |
| **Nuova pagina super-admin**: `/super` | Tabella tenant, metriche globali (MRR, churn, attivi). |

### Deployment

- **1 app Emergent** per il backend (multi-tenant API)
- **1 app Emergent** per il frontend (serve a qualsiasi host)
- **DNS**: wildcard subdomain `*.tuosito.com` → frontend Emergent
- Per domini custom cliente (`www.pizzeriadamario.it`): CNAME setup guidato, SSL automatico

---

## 📅 Stime di effort

| Fase | Ore | Crediti Emergent stimati |
|---|---|---|
| **F1 — Backend multi-tenancy** (db schema, middleware, isolation, JWT con tenant) | 8–10h | ~80–100 |
| **F2 — Tenant CRUD + onboarding wizard** (registrazione, configurazione brand iniziale) | 6–8h | ~60–80 |
| **F3 — Billing Stripe subscriptions + webhook + feature gate** | 8–10h | ~80–100 |
| **F4 — Frontend dynamic brand loading + `/brand/edit` UI** | 6–8h | ~60–80 |
| **F5 — Super-admin dashboard** (lista tenant, KPI, supporto) | 4–6h | ~40–60 |
| **F6 — Domain mapping + wildcard DNS + SSL setup guide** | 3–4h | ~30–50 |
| **F7 — Migrazione dati Tierra come primo tenant + QA** | 3–4h | ~30–50 |
| **TOTALE** | **~40–50h** | **~380–520 crediti** |

> 💰 **Costo stimato in $:** tra $100 (piano $200/mese) e $175 (top-up necessario).
>
> Con un abbonamento **$200/mese (1.550 crediti)** puoi fare la Strada C **e tenerti margine** per 3-4 mesi di iterazioni/manutenzione.

---

## 🚦 Roadmap consigliata per massimizzare ROI

### Settimana 1 — MVP SaaS (F1 + F2 + F4 parziale)
- Multi-tenant DB + auth
- Onboarding: nuovo ristorante si registra, configura brand, vede il suo sito
- **Risultato**: puoi vendere a 2-3 clienti pilota (sconto 50% "beta partners")

### Settimana 2 — Revenue engine (F3)
- Stripe abbonamenti attivi
- Feature gate per piani
- **Risultato**: revenue ricorrente automatica

### Settimana 3 — Scale tools (F5 + F6)
- Super-admin dashboard
- Domini custom per clienti Gold
- **Risultato**: pronto ad accogliere 20+ clienti senza attrito operativo

---

## 💼 Modello di pricing consigliato (per i tuoi clienti)

| Piano | Prezzo | Margine lordo* | Funzionalità |
|---|---|---|---|
| **Bronze** | €39/mese | ~€32 | Sito + menu + WhatsApp link + stats base |
| **Silver** | €79/mese | ~€65 | + Stripe checkout + email + marketing list |
| **Gold** | €129/mese | ~€110 | + WhatsApp broadcast + stampante Sunmi + dominio custom + priorità supporto |

*margine dopo costi Stripe + Twilio WhatsApp + Emergent

### Break-even analysis
- Costo Emergent setup una-tantum: ~$100-175
- Costo Emergent mensile (per mantenere ~10-20 clienti attivi): ~$50-100
- Break-even: **2-3 clienti Silver** o **1 cliente Gold**

Con **5 clienti Gold** = €645/mese di revenue ricorrente, ~€450 margine netto. 🚀

---

## ⚠️ Rischi / considerazioni

1. **Privacy/GDPR**: con multi-tenant tutti i dati su 1 DB. Serve data-processing agreement con i clienti.
2. **Stripe onboarding**: se vuoi incassare tu (non i clienti direttamente), serve Stripe Connect che è più complesso. Alternativa: ogni cliente collega il suo Stripe, tu addebiti solo la tua fee.
3. **Meta WhatsApp Business API**: ogni cliente deve avere il suo numero approvato da Meta. Non è istantaneo. Considera di offrirlo come add-on separato.
4. **Supporto**: con 10+ clienti servirà almeno uno strumento di ticketing (Intercom, Help Scout).

---

## 🎬 Cosa serve per partire

1. **Tua decisione**: budget (crediti) disponibile nei prossimi 30 giorni
2. **Stripe account** (il tuo, per incassare) — o strategy di Stripe Connect
3. **Dominio** per il SaaS (es. `tuo-brand.it`) con accesso al DNS per wildcard
4. **2-3 clienti pilota** pronti a fare beta test (possono essere anche Tierra stesso + 2 amici ristoratori)

---

## ✉️ Next step

Quando sei pronto dimmi:
1. Quale piano Emergent hai attivato (così so il budget)
2. Se procediamo in un'unica sprint o una fase per volta
3. Se hai già un dominio / dei clienti pilota in mente
