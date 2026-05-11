import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import MenuRow from "../components/MenuRow";
import SpecialsBanner from "../components/SpecialsBanner";
import { ReviewCTACard, ReviewCTABanner } from "../components/ReviewCTA";
import SEO, { menuSchema, restaurantSchema } from "../components/SEO";

const MenuPage = () => {
    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState([]);
    const [active, setActive] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.get("/menu/categories"), api.get("/menu/items")])
            .then(([c, i]) => {
                setCategories(c.data);
                setItems(i.data);
                setActive(c.data[0]?.slug || null);
            })
            .finally(() => setLoading(false));

        // Live availability sync from Tierra OS — every 20s when tab is visible
        const interval = setInterval(() => {
            if (document.hidden) return;
            api.get("/menu/items").then((r) => setItems(r.data)).catch(() => {});
        }, 20000);
        return () => clearInterval(interval);
    }, []);

    const activeCategory = categories.find((c) => c.slug === active);
    const visibleItems = items.filter((i) => i.category_slug === active);

    return (
        <div data-testid="menu-page" className="bg-tierra-bg min-h-screen pt-2">
            <SEO
                title="Menù Tierra Organic Bistrot Roma | Poke Bowl, Colazione Bio, Aperitivo"
                description="Il menù completo di Tierra Organic Bistrot: poke bowl personalizzabili da €13, avocado toast, colazione biologica, Aperitierra e piatti del giorno. Via Tirso 34, Roma — quartiere Parioli."
                path="/menu"
                schemas={[restaurantSchema(), menuSchema(items)]}
                breadcrumbs={[
                    { name: "Home", path: "/" },
                    { name: "Menù", path: "/menu" },
                ]}
            />
            {/* ─── HERO — editorial magazine masthead ─── */}
            <section className="max-w-screen-xl mx-auto px-6 lg:px-12 pt-12 pb-16">
                <div className="flex items-baseline gap-5 mb-10">
                    <span className="mag-number text-6xl sm:text-7xl">N°</span>
                    <span className="h-px flex-1 max-w-32 bg-tierra-ink/30 mb-3" />
                    <span className="overline">Il nostro menù</span>
                </div>
                <h1 className="h-display text-tierra-ink leading-[0.95] max-w-5xl"
                    style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}>
                    Ogni piatto,<br/>
                    <span className="italic font-light text-tierra-brand">una storia.</span>
                </h1>
                <p className="mt-10 text-tierra-ink2 leading-relaxed max-w-2xl text-lg">
                    Ingredienti di stagione, materie prime tracciate, ricette cucinate a vista.
                    Aggiungi al carrello e scegli come gustarli — al tavolo, da asporto, o a casa.
                </p>
            </section>

            {/* Specials banner */}
            <div className="max-w-screen-xl mx-auto px-6 lg:px-12 space-y-4">
                <SpecialsBanner />
                <ReviewCTABanner testId="menu-top-review-banner" />
            </div>

            {/* ─── Editorial category nav (sticky) ─── */}
            <div className="sticky top-[5.5rem] sm:top-[5.75rem] z-30 bg-tierra-bg/95 backdrop-blur-md border-y border-tierra-ink/10 mt-12">
                <div className="max-w-screen-xl mx-auto px-6 lg:px-12 overflow-x-auto">
                    <nav className="flex gap-8 sm:gap-12 py-5 min-w-max">
                        {categories.map((c, idx) => (
                            <button
                                key={c.slug}
                                data-testid={`cat-tab-${c.slug}`}
                                onClick={() => setActive(c.slug)}
                                className={`relative font-display text-lg sm:text-xl tracking-tight transition-colors whitespace-nowrap pb-1.5 flex items-baseline gap-2 ${
                                    active === c.slug
                                        ? "text-tierra-ink italic"
                                        : "text-tierra-ink2 hover:text-tierra-ink"
                                }`}
                            >
                                <span className={`text-xs ${active === c.slug ? "text-tierra-brand" : "text-tierra-muted"}`}>
                                    {String(idx + 1).padStart(2, "0")}
                                </span>
                                {c.name}
                                {active === c.slug && (
                                    <span className="absolute -bottom-px left-0 right-0 h-px bg-tierra-brand" />
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* ─── Items list (editorial: dotted leaders) ─── */}
            <section className="max-w-5xl mx-auto px-6 lg:px-12 py-16">
                {activeCategory && (
                    <div className="mb-12 flex items-baseline gap-5">
                        <span className="mag-number text-5xl">
                            {String(categories.findIndex(c => c.slug === active) + 1).padStart(2, "0")}
                        </span>
                        <span className="h-px w-12 bg-tierra-ink/30 mb-2" />
                        <span className="overline">{activeCategory.name}</span>
                    </div>
                )}
                {activeCategory && activeCategory.description && (
                    <p className="text-tierra-ink2 leading-relaxed max-w-2xl mb-12 italic font-display text-xl">
                        {activeCategory.description}
                    </p>
                )}

                {loading ? (
                    <div className="text-center py-20 text-tierra-ink2">Caricamento...</div>
                ) : visibleItems.length === 0 ? (
                    <div className="text-center py-20 text-tierra-ink2 italic font-display text-2xl">
                        Nessun piatto disponibile in questa categoria.
                    </div>
                ) : (
                    <div className="border-t border-tierra-ink/15">
                        {visibleItems.map((it) => <MenuRow key={it.id} item={it} />)}
                    </div>
                )}

                {/* Allergen legend */}
                <div className="mt-14 pt-8 border-t border-tierra-ink/10">
                    <p className="overline text-tierra-brand mb-4">Allergeni</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-tierra-ink2">
                        <span><strong className="font-semibold text-tierra-ink">G</strong> Glutine</span>
                        <span><strong className="font-semibold text-tierra-ink">L</strong> Lattosio</span>
                        <span><strong className="font-semibold text-tierra-ink">E</strong> Uova</span>
                        <span><strong className="font-semibold text-tierra-ink">N</strong> Frutta a guscio</span>
                        <span><strong className="font-semibold text-tierra-ink">F</strong> Pesce</span>
                        <span><strong className="font-semibold text-tierra-ink">S</strong> Solfiti</span>
                    </div>
                </div>
            </section>

            {/* Google Review CTA */}
            <section className="max-w-4xl mx-auto px-6 lg:px-12 pb-20">
                <ReviewCTACard testId="menu-review-cta" />
            </section>
        </div>
    );
};

export default MenuPage;
