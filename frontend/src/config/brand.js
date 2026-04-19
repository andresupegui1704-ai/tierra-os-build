/**
 * ════════════════════════════════════════════════════════════════════
 *  BRAND CONFIG — Single source of truth for all brand-specific data
 * ════════════════════════════════════════════════════════════════════
 *
 *  When reusing this template for a new client, EDIT ONLY THIS FILE
 *  (plus the matching /app/backend/brand_config.py and the images
 *  under /app/frontend/public/brand and /app/frontend/public/gallery).
 *
 *  See /app/TEMPLATE_README.md for the full rebrand checklist.
 */

export const BRAND = {
    // ─── Identity ──────────────────────────────────────────────────
    name: "Tierra",
    fullName: "Tierra Organic Bistrot Café",
    shortDescriptor: "organic · bistrot · café",
    sinceYear: "2019",

    // ─── Contact ───────────────────────────────────────────────────
    address: {
        street: "Via Tirso 34",
        city: "Roma",
        full: "Via Tirso 34, Roma",
    },
    phone: {
        display: "+39 347 991 5420",
        tel: "+393479915420",        // for tel: links
        whatsapp: "393479915420",    // for wa.me links (no + sign)
    },
    email: "tierraorganicbistrot@gmail.com",

    // ─── Opening hours ─────────────────────────────────────────────
    hours: [
        { days: "Lun – Ven", time: "08:00 – 23:00" },
        { days: "Sab – Dom", time: "09:00 – 23:30" },
    ],
    specialHours: {
        label: "Aperitierra",         // name of the daily happy hour
        time: "Tutti i giorni · 18:00 – 20:00",
    },

    // ─── External links ────────────────────────────────────────────
    links: {
        googleReview: "https://share.google/eVhM03mToB5eMlaWw",
        instagram: "https://instagram.com/tierra_organic_bistrot",
        instagramHandle: "@tierra_organic_bistrot",
        // Embed URL for Google Maps (query mode — no API key needed)
        mapsEmbed: "https://www.google.com/maps?q=Via+Tirso+34,+Roma&output=embed&z=16",
        mapsDirections: "https://www.google.com/maps/dir/?api=1&destination=Via+Tirso+34,+Roma",
    },

    // ─── Image assets (all live under /app/frontend/public) ────────
    assets: {
        logo: "/brand/tierra-logo.png",
        gallery: {
            banco: "/gallery/banco.webp",
            sala: "/gallery/sala.webp",
            tavolo: "/gallery/tavolo.webp",
            facciata: "/gallery/facciata.webp",
            dehors1: "/gallery/dehors-1.webp",
            dehors2: "/gallery/dehors-2.webp",
            dehors3: "/gallery/dehors-3.webp",
        },
    },

    // ─── Copy (all the landing / header / footer text) ─────────────
    copy: {
        // Hero 1 (logo-centered)
        heroOverline: "Dal 2019 · Roma",
        heroTitle: {
            prefix: "Benvenuti da",
            brandEmph: "Tierra",
            middle: "un bistrot biologico",
            middleEmph: "che sa di casa",
            suffix: "con prodotti assolutamente organici.",
        },
        heroSubtext:
            "Ingredienti di stagione, materie prime tracciate, ricette cucinate a vista — ti aspettiamo in Via Tirso 34, a Roma.",

        // Ticker strip
        ticker: [
            "100% biologico",
            "Farm-to-table",
            "Ingredienti di stagione",
            "Poke & Ceviche",
            "Aperitierra 18 – 20",
        ],

        // Hero 2 (dark photo overlay)
        hero2Title: { prefix: "Benvenuti", emph: "a casa" },

        // Story section
        storyOverline: "La nostra storia",
        storyHeadline: { prefix: "Una cucina che", emph: "ascolta", suffix: "la stagione." },
        storyBody: [
            "Tierra nasce da un'idea semplice: cucinare bene, con ingredienti veri. Scegliamo piccoli produttori locali, farine biologiche, pesce del giorno e verdure di stagione.",
            "Dalla colazione all'aperitivo, ogni piatto è pensato per farti stare bene — senza mai rinunciare al gusto. Ci trovi a due passi dal centro, in un'atmosfera calma, luminosa, accogliente.",
        ],

        // Pillars (3 values)
        pillars: [
            { title: "100% Biologico", body: "Ingredienti certificati, coltivati senza pesticidi. Trasparenza su ogni piatto." },
            { title: "Filiera corta", body: "Lavoriamo con piccoli produttori italiani per ridurre sprechi e chilometri." },
            { title: "Ricette d'autore", body: "Poke bowls, ceviche, taglieri artigianali, dolci da forno fatti in casa ogni mattina." },
        ],

        // Dehors section
        dehorsOverline: "Il nostro dehors",
        dehorsTitle: { prefix: "Sotto le", emph: "lanterne", suffix: "in Via Tirso." },
        dehorsBody:
            "Un dehors coperto, foglie d'eucalipto essiccate, lanterne in rattan e funghi riscaldanti per stare fuori tutto l'anno. Un angolo di Roma dove il tempo rallenta — perfetto per una colazione lenta, un pranzo genuino o l'Aperitierra al tramonto.",

        // Order modes CTA block
        orderCtaOverline: "Delivery · Asporto · Sul posto",
        orderCtaTitle: { prefix: "Ordina come", emph: "preferisci" },
        orderCtaBody:
            "Preferisci mangiare a casa? Fare un salto veloce a ritirare? O prenotare un tavolo e trovare il tuo ordine pronto al tuo arrivo? Scegli tu. Ci pensiamo noi.",

        // Contact section
        contactOverline: "Ti aspettiamo",
        contactTitle: { prefix: "Vieni a trovarci in", emphAddress: true },

        // Footer
        footerDescription:
            "Un bistrot biologico nel cuore di Roma. Ingredienti di stagione, ricette d'autore, un'esperienza che celebra il gusto autentico.",

        // WhatsApp prefilled message (url-encoded automatically by components)
        whatsappHelloText: "Ciao Tierra! Vorrei qualche info 🌿",
        whatsappShortText: "Ciao Tierra!",

        // Google review CTA
        reviewOverline: "Ti è piaciuto?",
        reviewHeadline: {
            prefix: "Lascia una",
            emph: "recensione",
            suffix: "su Google — ti offriamo un dolce pensiero.",
        },
        reviewBody:
            "Se sei stato bene, diccelo e aiutaci a crescere. Ti regaleremo uno dei nostri biscotti artigianali — un piccolo grazie per il tuo tempo.",
        reviewMicrocopy: "Mostraci lo screenshot in cassa · pensiamo noi al biscotto",
        reviewGiftName: "uno dei nostri biscotti artigianali",
    },
};

// ─── Color palette (for reference / README find-replace) ───────────
// Currently these colors are used as Tailwind arbitrary values
// (e.g. `bg-[#8A5B3D]`) throughout the codebase. To rebrand the palette,
// do a project-wide find-replace of these hex codes.
export const BRAND_COLORS = {
    darkBrown: "#2C2418",   // primary text / headings
    brown: "#8A5B3D",       // warm accent / links
    brownSoft: "#6F4527",   // dark accent
    green: "#7C9A4A",       // organic green / CTA
    greenDeep: "#5E7F32",   // darker green
    cream: "#F5EFE2",       // light bg
    beige: "#EADFC9",       // secondary bg
    paper: "#FFFDF7",       // paper white
    body: "#5C4E3C",        // body text
    muted: "#9B8E7A",       // muted text
    gold: "#C9A94E",        // star / review accent
};

// Convenience helpers
export const waLink = (text = BRAND.copy.whatsappHelloText) =>
    `https://wa.me/${BRAND.phone.whatsapp}?text=${encodeURIComponent(text)}`;

export const telLink = () => `tel:${BRAND.phone.tel}`;
export const mailtoLink = () => `mailto:${BRAND.email}`;
