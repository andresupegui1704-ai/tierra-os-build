# CleanMate — Report di Progetto Completo

**Data consegna:** 2026-02  
**Versione:** 1.0.0  
**Piattaforma:** Expo React Native (iOS + Android)  
**Preview URL attuale:** https://smart-organizer-56.preview.emergentagent.com

---

## 1. Obiettivo del prodotto

App mobile in stile iOS nativo che aiuta l'utente a:
1. **Ripulire foto duplicate / simili** dalla galleria con rilevamento AI
2. **Aggiornare/organizzare cartelle** tramite categorizzazione intelligente del contenuto
3. **Ripulire email** inutili (spam, promozioni, newsletter) dall'inbox Gmail

---

## 2. Stack tecnologico

| Livello | Tecnologia | Versione |
|---|---|---|
| Frontend | Expo SDK | 54 |
| Router | expo-router (file-based) | 6.x |
| Icone | lucide-react-native | 1.14 |
| Gesture | react-native-gesture-handler | 2.28 |
| Animazioni | Animated API + react-native-reanimated | 4.x |
| Picker foto | expo-image-picker | 17.0.11 |
| Media library | expo-media-library | 18.2.1 |
| Haptic | expo-haptics | 15.x |
| Backend | FastAPI + Motor (MongoDB async) | 0.110 |
| AI | Gemini 2.5 Flash via emergentintegrations | 0.1.0 |
| DB | MongoDB | 7.x |
| LLM Key | Emergent Universal Key | — |

---

## 3. Struttura del progetto

```
/app
├── backend/
│   ├── server.py              # Tutte le API (13 endpoint)
│   ├── requirements.txt
│   ├── .env                   # MONGO_URL, DB_NAME, EMERGENT_LLM_KEY
│   └── tests/
│       └── backend_test.py    # 17 pytest tests (100% pass)
├── frontend/
│   ├── app/                   # expo-router routes
│   │   ├── _layout.tsx        # Root stack
│   │   ├── index.tsx          # Splash → redirect
│   │   ├── onboarding.tsx     # 3 slide di benvenuto
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx    # Bottom tab bar (5 tabs, BlurView)
│   │   │   ├── index.tsx      # Home dashboard
│   │   │   ├── photos.tsx     # Photo Cleaner + Scan overlay
│   │   │   ├── albums.tsx     # Smart Albums grid
│   │   │   ├── emails.tsx     # Email Cleaner + swipe-to-delete
│   │   │   └── settings.tsx   # Settings / Gmail connect
│   │   └── album/
│   │       └── [category].tsx # Dettaglio album (griglia 3-col)
│   ├── src/lib/api.ts         # API client + tipi + categorie
│   ├── app.json               # Permessi iOS/Android configurati
│   ├── package.json
│   └── .env                   # EXPO_PUBLIC_BACKEND_URL
├── memory/
│   └── PRD.md                 # Product Requirements
├── image_testing.md           # Linee guida test immagini
└── REPORT.md                  # ← questo file
```

---

## 4. Schermate (UX flow)

```
Splash (0.4s)
  ↓
Onboarding (3 slide: Duplicati → Organizzazione → Inbox)
  ↓
┌─────────────────────────────────────────────┐
│  Bottom Tab Bar (blur glassmorphism)         │
├─────────────┬───────────┬───────────┬────────┤
│   Home      │  Photos   │  Albums   │ Emails │
│  (dashboard)│  (scanner)│  (grid)   │(cleaner│
└─────────────┴───────────┴───────────┴────────┘
                                          ↓
                                    Album Detail (tap su album)
```

### 4.1 Home
- Card hero "Space Saved" con contatore MB animato
- 2 sub-stat: foto pulite, email pulite
- 3 quick action: Clean Photos, Smart Albums, Clean Inbox
- Tip card settimanale

### 4.2 Photos
- Picker multi-selezione (max 10 foto)
- Pulsante "Try demo scan" (showcase senza bisogno di foto)
- **Overlay di scansione animato**: icona pulsante, 6 step rotanti, progress bar
- Risultati: gruppi con badge "EXACT DUPLICATE" / "SIMILAR" + categoria
- Badge verde "Keep" sulla foto con quality_score migliore
- Azione "Keep best & delete rest" per gruppo
- Undo globale

### 4.3 Albums
- Griglia 2 colonne categorie con icona Sparkles e sfondo colorato
- Tap → navigazione a `/album/[category]`
- Pull-to-refresh
- **Dettaglio album**: griglia 3 colonne con back button, pill contatore

### 4.4 Emails
- Inbox demo (18 email seed: 4 spam, 5 promo, 4 newsletter, 3 social, 2 utili)
- Raggruppate per categoria con icona colorata
- **Swipe-to-delete**: swipe right-to-left → azione rossa "Delete"
- Multi-select + "Select all junk" + FAB con conferma delete
- Pull-to-refresh
- Empty state con "Restore demo inbox"

### 4.5 Settings
- Card Gmail (demo mode, tap mostra info OAuth)
- Switch Haptic Feedback
- Switch Auto-scan settimanale
- Reset totale dati
- About con versione

---

## 5. API Backend (prefisso `/api`)

| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/` | Welcome |
| POST | `/photos/analyze` | Analisi AI singola foto (Gemini) |
| POST | `/photos/batch-analyze` | Batch max 10 foto |
| POST | `/photos/find-duplicates` | Raggruppa per SHA256 (exact) + feature overlap (similar) |
| POST | `/photos/demo-scan` | Demo con 7 foto seed → 3 gruppi |
| GET | `/photos/albums` | Aggregazione categorie |
| GET | `/photos/by-category/{category}` | Foto per categoria + URL |
| GET | `/emails/scan` | Inbox demo filtrato per deleted |
| POST | `/emails/delete` | Marca email come eliminate |
| POST | `/emails/reset` | Ripristina inbox demo |
| GET | `/stats` | Statistiche utente |
| POST | `/stats/record-photo-cleanup` | Incrementa foto pulite + MB |
| POST | `/stats/reset` | Reset stats |
| GET | `/gmail/status` | Stato connessione (demo mode) |

---

## 6. Design System

### Colori (JSON in `design_guidelines.json`)
- `primary`: `#005BB5` (Cerulean Blue)
- `secondary`: `#10B981` (Emerald)
- `destructive`: `#EF4444`
- `background`: `#FFFFFF`
- `surface`: `#F8FAFC`
- `text_primary`: `#020617`
- `text_secondary`: `#64748B`

### Tipografia
System font (SF Pro su iOS, Roboto su Android)  
H1: 30/800, H2: 24/700, body: 15/400, overline: 12/700 +1.4 tracking

### Spacing & Radius
8pt grid · screen padding 24 · card padding 20 · gap 16 · radius 16/20/24/pill

### Interazioni
- Haptic feedback su tap critici (impact/notification)
- Pull-to-refresh su Emails e Albums
- Animazione scan overlay (pulse + progress bar)
- BlurView su tab bar iOS

---

## 7. Testing

### Backend: **17/17 pytest PASS** (100%)
File: `/app/backend/tests/backend_test.py`

Coperti:
- Tutti gli endpoint sopra
- Validazione input (400 su email_ids vuoto, 400 su >10 foto)
- Esclusione `_id` ObjectId (no leak)
- Demo scan: 7 foto → 1 exact + 2 similar
- By-category con e senza risultati
- Delete + reset state

### Frontend
Verificato su mobile viewport 390×844:
- Onboarding, Home, Photos, Albums, Emails, Settings, Album Detail tutti renderizzano
- Navigazione tab + stack funzionante
- Demo-scan end-to-end (picker → overlay → risultati → delete)
- Swipe-to-delete operativo
- Tutti gli elementi interattivi hanno `testID` univoci

---

## 8. Limitazioni note & MOCKED

| Funzionalità | Stato | Come sbloccare |
|---|---|---|
| Gmail reale | **MOCKED** (18 email demo in MongoDB) | Creare credenziali Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) e implementare il flusso dal playbook Gmail già documentato |
| Analisi AI Gemini | **FALLBACK** (budget LLM key esaurito) | Top-up da **Profilo → Universal Key → Add Balance** |
| Eliminazione fisica foto iOS | **Non su Expo Go** | Build nativa con `expo-media-library.deleteAssetsAsync` |
| Push notification weekly | **UI placeholder** | Aggiungere `expo-notifications` + scheduler |

---

## 9. Come procedere con il deploy

### Opzione A — Test rapido su iPhone (Expo Go)
1. "Save to GitHub" da Emergent → clone locale
2. `cd frontend && yarn install && npx expo start`
3. Scansiona QR con Expo Go

### Opzione B — Build nativa TestFlight / App Store
```bash
cd frontend
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas submit
```

### Opzione C — Deploy backend
1. Crea MongoDB Atlas (free tier)
2. Push backend su Railway / Render / Fly.io
3. Configura env: `MONGO_URL`, `DB_NAME`, `EMERGENT_LLM_KEY`
4. Aggiorna `EXPO_PUBLIC_BACKEND_URL` nel frontend

---

## 10. Idea di monetizzazione (Freemium)

| Tier | Prezzo | Feature |
|---|---|---|
| **Free** | €0 | 50 foto/mese AI scan · inbox demo · 1 auto-clean/settimana |
| **Pro** | €4.99/mese | Scan illimitati · Gmail reale · auto-clean giornaliero · scansione iCloud Photos deep · report PDF mensili |
| **Family** | €9.99/mese | Pro per 5 utenti · spazio condiviso tracked |

Revenue potential (Italia, 10k download/mese, 5% conversion): **~€2,500/mese** a regime.

---

## 11. Prossimi passi consigliati

- [ ] **Top-up Emergent LLM Key** per abilitare analisi AI reale
- [ ] **Integrare Gmail OAuth** reale (playbook già pronto)
- [ ] Abilitare `expo-notifications` per auto-scan settimanale
- [ ] Aggiungere swipe-to-keep anche sulle foto (parità UX con email)
- [ ] Multi-select nel Smart Album detail
- [ ] Dark mode toggle
- [ ] Localizzazione IT/EN/ES
- [ ] Stripe integration per Pro subscription
- [ ] Analytics (PostHog o Amplitude)

---

## 12. File di consegna

Tutto il codice è in `/app`. Modi per portarlo fuori da Emergent:

1. **Bottone "Save to GitHub"** (in alto a destra nella chat Emergent) → push automatico su tuo repo
2. **Archivio scaricabile**: `cleanmate-v1.0.0.tar.gz` (~fino a qualche MB, senza node_modules) — creato in `/app/cleanmate-v1.0.0.tar.gz`

Contatto supporto Emergent per IPA/TestFlight: support@emergent.sh

---

**Buon deploy! 🚀**
