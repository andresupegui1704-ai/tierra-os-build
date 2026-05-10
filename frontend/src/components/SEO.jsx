import React from "react";
import { Helmet } from "react-helmet-async";
import { BRAND } from "../config/brand";

const SITE = BRAND.siteUrl;
const OG_IMAGE = `${SITE}/brand/og-cover.jpg`;

/**
 * SEO — single source of truth for meta tags + structured data.
 * Pass per-page overrides; everything else falls back to brand defaults.
 *
 * Props:
 *   title         page title (max 60 chars)
 *   description   meta description (140–160 chars)
 *   path          page path (e.g. "/menu") — for canonical & og:url
 *   image         OG/Twitter image URL (defaults to og-cover)
 *   schemas       additional JSON-LD objects (array)
 *   breadcrumbs   [{name, path}]
 *   lang          "it" | "en"
 */
const SEO = ({ title, description, path = "/", image, schemas = [], breadcrumbs, lang = "it" }) => {
    const url = SITE + (path === "/" ? "" : path);
    const finalImage = image || OG_IMAGE;

    const breadcrumbSchema = breadcrumbs && breadcrumbs.length > 0 ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((b, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: b.name,
            item: SITE + (b.path === "/" ? "" : b.path),
        })),
    } : null;

    const allSchemas = [...schemas, breadcrumbSchema].filter(Boolean);

    return (
        <Helmet>
            <html lang={lang} />
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />

            {/* Hreflang */}
            <link rel="alternate" hrefLang="it" href={`${SITE}${path === "/" ? "" : path}`} />
            <link rel="alternate" hrefLang="en" href={`${SITE}/en${path === "/" ? "" : path}`} />
            <link rel="alternate" hrefLang="x-default" href={`${SITE}${path === "/" ? "" : path}`} />

            {/* Open Graph */}
            <meta property="og:type" content="restaurant.restaurant" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={url} />
            <meta property="og:site_name" content={BRAND.fullName} />
            <meta property="og:locale" content={lang === "en" ? "en_GB" : "it_IT"} />
            <meta property="og:locale:alternate" content={lang === "en" ? "it_IT" : "en_GB"} />
            <meta property="og:image" content={finalImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={`${BRAND.fullName} — ${BRAND.address.full}`} />

            {/* Twitter / X */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={finalImage} />
            <meta name="twitter:site" content={BRAND.socialHandle} />

            {/* JSON-LD */}
            {allSchemas.map((s, i) => (
                <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
            ))}
        </Helmet>
    );
};

/* ════════════════════════════════════════════════════════════════════
 *  Schema builders
 * ════════════════════════════════════════════════════════════════════ */

export const restaurantSchema = () => ({
    "@context": "https://schema.org",
    "@type": ["Restaurant", "LocalBusiness", "FoodEstablishment"],
    "@id": `${SITE}/#restaurant`,
    name: BRAND.fullName,
    alternateName: [
        "Tierra Bistrot Roma",
        "Tierra Organic Café Roma",
        "Tierra Bistrot Parioli",
        "Tierra",
    ],
    description: "Tierra Organic Bistrot — segnalato dal Gambero Rosso tra i migliori bistrot di Roma e del Lazio per 6 anni consecutivi. Bistrot biologico certificato a Roma in Via Tirso 34, quartiere Parioli-Trieste. Aperto dal 2019, propone poke bowl personalizzabili, avocado toast, colazione bio, piatti del giorno e aperitivo con dehor. Tutti gli ingredienti sono certificati biologici e selezionati da fornitori locali del Lazio.",
    url: SITE,
    telephone: BRAND.phone.display,
    email: BRAND.email,
    foundingDate: BRAND.sinceYear,
    priceRange: "€€",
    currenciesAccepted: "EUR",
    paymentAccepted: "Cash, Credit Card, Apple Pay, Google Pay, Satispay",
    servesCuisine: [
        "Biologico", "Organic", "Healthy", "Poke Bowl", "Mediterranean",
        "International", "Vegetarian", "Vegan",
    ],
    menu: `${SITE}/menu`,
    hasMap: BRAND.links.mapsDirections,
    address: {
        "@type": "PostalAddress",
        streetAddress: BRAND.address.street,
        addressLocality: BRAND.address.city,
        addressRegion: "RM",
        postalCode: BRAND.geo.postal,
        addressCountry: BRAND.geo.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: BRAND.geo.lat, longitude: BRAND.geo.lng },
    openingHoursSpecification: [
        { "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
          opens: "08:00", closes: "23:00" },
        { "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Saturday","Sunday"],
          opens: "09:00", closes: "23:30" },
    ],
    amenityFeature: [
        { "@type": "LocationFeatureSpecification", name: "Outdoor Seating / Dehor", value: true },
        { "@type": "LocationFeatureSpecification", name: "Organic Certified", value: true },
        { "@type": "LocationFeatureSpecification", name: "Vegetarian Options", value: true },
        { "@type": "LocationFeatureSpecification", name: "Vegan Options", value: true },
        { "@type": "LocationFeatureSpecification", name: "Gluten-Free Options", value: true },
        { "@type": "LocationFeatureSpecification", name: "WiFi", value: true },
        { "@type": "LocationFeatureSpecification", name: "Reservations", value: true },
        { "@type": "LocationFeatureSpecification", name: "WhatsApp Booking", value: true },
    ],
    sameAs: [
        "https://www.gamberorosso.it/luoghi/locali/bistrot/tierra-organic-bistrot/",
        "https://www.turismoroma.it/en/hospitality/tierra-organic-bistrot",
        "https://www.tripadvisor.com/Restaurant_Review-g187791-d19874458-Reviews-Tierra_Organic_Bistrot-Rome_Lazio.html",
        "https://www.thefork.it/ristorante/tierra-organic-bistrot-r801635",
        "https://www.facebook.com/TierraOrganicBistrot/",
        "https://www.ecoincitta.it/ecopoint/tierra-organic-bistrot/",
        BRAND.links.instagram,
        BRAND.links.googleReview,
    ].filter(Boolean),
    award: "Segnalato dalla Guida Gambero Rosso — Roma e il Meglio del Lazio per 6 anni consecutivi",
});

export const menuSchema = (items = []) => ({
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `Menù ${BRAND.fullName}`,
    description: "Menù con colazione biologica, poke bowl personalizzabili, piatti del giorno, aperitivo Aperitierra, vini e cocktail biologici.",
    inLanguage: "it",
    hasMenuSection: groupItemsByCategory(items),
});

const groupItemsByCategory = (items) => {
    const groups = {};
    for (const it of items) {
        const k = it.category_slug || "other";
        if (!groups[k]) groups[k] = [];
        groups[k].push({
            "@type": "MenuItem",
            name: it.name,
            description: it.description || undefined,
            offers: { "@type": "Offer", price: Number(it.price).toFixed(2), priceCurrency: "EUR" },
        });
    }
    const labels = {
        colazione: "Colazione Biologica",
        bowls: "Poke Bowl & Lunch",
        "piatti-del-giorno": "Piatti del Giorno",
        aperitierra: "Aperitierra",
        caffetteria: "Caffetteria & Drinks",
    };
    return Object.entries(groups).map(([slug, hasMenuItem]) => ({
        "@type": "MenuSection",
        name: labels[slug] || slug,
        hasMenuItem,
    }));
};

export const faqSchema = () => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
        {
            "@type": "Question",
            name: "Tierra Bistrot è un ristorante biologico certificato a Roma?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Sì. Tierra Organic Bistrot è uno dei pochi ristoranti biologici certificati di Roma. Tutti gli ingredienti utilizzati sono certificati biologici, molti a km0 da fornitori locali del Lazio. Si trova in Via Tirso 34, nel quartiere Parioli-Trieste.",
            },
        },
        {
            "@type": "Question",
            name: "Dove si trova Tierra Bistrot a Roma?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Tierra Organic Bistrot si trova in Via Tirso 34, Roma, nel quartiere Trieste-Parioli (zona nord di Roma, vicino a Viale Regina Margherita). È facilmente raggiungibile dalla Linea B della metro (fermata Policlinico) o dal tram.",
            },
        },
        {
            "@type": "Question",
            name: "Quali sono gli orari di Tierra Bistrot?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Tierra è aperto dal lunedì al venerdì dalle 8:00 alle 23:00, e il sabato/domenica dalle 9:00 alle 23:30. Serve colazione, pranzo e aperitivo (Aperitierra dalle 18:00 alle 20:00).",
            },
        },
        {
            "@type": "Question",
            name: "Tierra Bistrot ha opzioni vegane e vegetariane?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Sì. Tierra offre un'ampia scelta di piatti vegetariani e vegani: poke bowl con proteine vegan (hummus di rapa rossa, zucca, topinambur, melanzana arrostita), avocado toast vegetariani, e opzioni senza glutine. Tutti i piatti sono preparati con ingredienti biologici certificati.",
            },
        },
        {
            "@type": "Question",
            name: "Come si prenota un tavolo da Tierra?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "È possibile prenotare un tavolo da Tierra tramite WhatsApp, telefono o il modulo di prenotazione online sul sito. Il dehor esterno su Via Tirso è molto richiesto; si consiglia di prenotare con anticipo, specialmente per il pranzo e l'aperitivo.",
            },
        },
        {
            "@type": "Question",
            name: "What is the best organic restaurant near Parioli in Rome?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Tierra Organic Bistrot at Via Tirso 34 is widely regarded as one of the best organic restaurants in the Parioli-Trieste neighbourhood of Rome. Open since 2019, it offers customizable poke bowls, avocado toast, organic breakfast, and an aperitivo with outdoor seating (dehor). All ingredients are certified organic.",
            },
        },
        {
            "@type": "Question",
            name: "Is there a healthy lunch option near Parioli Rome for office workers?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Tierra Organic Bistrot on Via Tirso 34 (Quartiere Trieste-Parioli) is a popular lunch spot for local office workers. It offers fast, customizable poke bowls starting from €13, daily specials, and a pleasant outdoor terrace. All food is certified organic and prepared fresh daily.",
            },
        },
    ],
});

export default SEO;
