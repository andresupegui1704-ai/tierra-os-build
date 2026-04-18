# 🍽️ Bistrot/Restaurant Site — Template Reuse Guide

This codebase is designed as a **reusable template** for restaurant / bistrot / café websites with full delivery/asporto/preorder + Stripe checkout + admin dashboard + sales stats + marketing list + thermal printer support.

Every **brand-specific** data point lives in **exactly two files** (plus images). To rebrand for a new client, follow the checklist below.

---

## 🕒 Estimated time per new client: 30–45 minutes

---

## ✅ Rebrand Checklist

### 1. Clone the repo for the new client

```bash
git clone <this-repo>.git pizzeria-da-mario
cd pizzeria-da-mario
```

### 2. Edit the two brand-config files

#### 🎨 Frontend — `/app/frontend/src/config/brand.js`
Contains:
- Brand name, full name, tagline, short descriptor
- Contact info (phone, email, WhatsApp number, full address)
- Opening hours + happy-hour slot
- Google review URL
- Image asset paths
- All hero / story / pillar / dehors / footer / review copy text
- WhatsApp prefilled messages

#### 🔧 Backend — `/app/backend/brand_config.py`
Contains:
- Brand name, full name
- Full address
- Phone, WhatsApp, email
- ESC/POS receipt header (3 lines, keep short for 80mm thermal)
- Email "FROM" display name

### 3. Replace images

| Path | What it is | Ratio |
|---|---|---|
| `/app/frontend/public/brand/tierra-logo.png` | Main logo (keep PNG with transparency) | square-ish |
| `/app/frontend/public/gallery/banco.webp` | Bar/counter shot | 4:5 portrait |
| `/app/frontend/public/gallery/sala.webp` | Dining room | 4:5 portrait |
| `/app/frontend/public/gallery/tavolo.webp` | Table detail | 4:5 portrait |
| `/app/frontend/public/gallery/facciata.webp` | Entrance with chef/sign | 4:5 portrait |
| `/app/frontend/public/gallery/dehors-1.webp` | Outdoor seating #1 | 4:5 portrait |
| `/app/frontend/public/gallery/dehors-2.webp` | Outdoor seating #2 | 4:5 portrait |
| `/app/frontend/public/gallery/dehors-3.webp` | Wide outdoor/hero shot | 16:9 landscape |

Dish photos can be uploaded directly via the **Admin Dashboard → Menù** (auto-cropped to 1:1 by `image_utils.py`).

### 4. Seed the menu

Edit `/app/backend/seed_data.py`:
- `CATEGORIES`: list of menu sections
- `ITEMS`: list of dishes (name, description, price, category_slug, image_url, customization logic)

The seed script runs automatically on first startup. To re-seed a fresh DB:
```bash
mongosh mongodb://localhost:27017/<new-db-name> --eval 'db.dropDatabase()'
sudo supervisorctl restart backend
```

### 5. Update `.env` files

`/app/backend/.env`:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="pizzeria_da_mario"            # unique per client
CORS_ORIGINS="*"
STRIPE_API_KEY=sk_live_xxx             # client's live Stripe key (or sk_test_ for dev)
RESEND_API_KEY=re_xxx                  # optional — for transactional email
ADMIN_EMAIL=admin@pizzeriadamario.it   # admin login
ADMIN_PASSWORD=<strong-password>       # admin login
JWT_SECRET=<random-32-chars>
```

`/app/frontend/.env`:
```env
REACT_APP_BACKEND_URL=https://pizzeria-da-mario.preview.emergentagent.com
WDS_SOCKET_PORT=443
```

### 6. (Optional) Change the color palette

The brand colors are currently used as Tailwind arbitrary values (e.g. `bg-[#8A5B3D]`). To change them, do a **project-wide find-and-replace** of the 6 hex codes below:

| Current | Meaning | Replace with |
|---|---|---|
| `#2C2418` | primary text / headings | dark color of new brand |
| `#8A5B3D` | warm accent / links | primary accent |
| `#7C9A4A` | organic green / CTA | secondary accent |
| `#5E7F32` | deep green | darker secondary |
| `#F5EFE2` | cream background | light bg |
| `#EADFC9` | beige secondary bg | soft accent |

Use VS Code's **Search & Replace** (`Cmd+Shift+H`) across the whole project, or:
```bash
cd /app/frontend/src
find . -type f \( -name "*.jsx" -o -name "*.js" -o -name "*.css" \) -exec sed -i 's/#8A5B3D/#NEWCOLOR/g' {} \;
```

All hex codes are also documented in `/app/frontend/src/config/brand.js` → `BRAND_COLORS` for reference.

### 7. Smoke test

```bash
sudo supervisorctl restart all
sleep 3
curl http://localhost:8001/api/info
```

Should return the new brand info. Then open the preview URL and verify:
- [ ] Logo appears in header & footer
- [ ] Nav, hero, contact, opening hours all show the new brand data
- [ ] WhatsApp button opens with the new number
- [ ] "Scrivi una recensione" points to the new Google review URL
- [ ] Admin login works with new `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- [ ] Order receipt preview (admin printer tab) shows the new header

### 8. Deploy

Use the **Deploy** button in the Emergent chat UI. Each client gets their own preview & production URL (separate DB, separate auth).

---

## 📂 Files that were intentionally LEFT hardcoded

These are generic UI labels that apply to any restaurant (Italian). If you target a non-Italian market, translate these via find-replace:

- Button labels: "Menù", "Prenota", "Carrello", "Paga con Stripe", "Ordina come preferisci"
- Service types: "Delivery", "Asporto", "Preordine"
- Form labels: "Nome e cognome", "Telefono", "Email", etc.
- Admin UI: "Statistiche", "Marketing", "Ordini", etc.

For multi-language support, consider a proper i18n solution (`react-i18next`) — planned for Phase 3.

---

## 🏗️ Architecture at a glance

```
/app
├── backend/
│   ├── server.py              FastAPI routes (all under /api)
│   ├── brand_config.py        🎯 BRAND DATA — edit this
│   ├── models.py              Pydantic schemas
│   ├── customizations.py      Poke/Secondo pricing rules
│   ├── seed_data.py           Menu seed (categories + items)
│   ├── email_service.py       Resend transactional emails
│   ├── escpos.py              Thermal printer ticket builder (2 copies)
│   ├── auth.py                JWT admin auth
│   └── storage.py             Image upload (S3-compatible)
└── frontend/src/
    ├── config/brand.js        🎯 BRAND DATA — edit this
    ├── pages/                 Landing, Menu, Checkout, Admin, etc.
    ├── components/            Header, Footer, Cart, ReviewCTA, etc.
    └── context/CartContext.jsx  Shopping cart state
```

---

## 💰 Pricing model (suggested)

| Tier | Setup fee | Monthly | Includes |
|---|---|---|---|
| Bronze | €500 | €29 | Site + menu + delivery/asporto + WhatsApp button |
| Silver | €900 | €49 | + Stripe checkout + email confirmations + stats |
| Gold | €1.500 | €79 | + WhatsApp broadcast + Resend mailing + thermal printer + priority support |

---

## 📝 Changelog hooks

When shipping a new feature *across all clients*, update `/app/memory/CHANGELOG.md` and tag releases (`git tag v1.2.0`). For updates that don't touch brand config, clients can `git pull` safely.
