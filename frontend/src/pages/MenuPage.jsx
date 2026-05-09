import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import MenuRow from "../components/MenuRow";
import SpecialsBanner from "../components/SpecialsBanner";
import { ReviewCTACard, ReviewCTABanner } from "../components/ReviewCTA";

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
        <div data-testid="menu-page" className="bg-[#F5EFE2] min-h-screen pt-24">
            {/* ─── HERO — editorial header (Soho/Hoxton vibe) ─── */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12">
                <div className="text-center max-w-3xl mx-auto">
                    <span className="ornament overline">Il nostro menù</span>
                    <h1 className="h-display text-5xl sm:text-7xl mt-8 leading-[1.05] text-[#2C2418]">
                        Ogni piatto, <span className="italic">una storia</span>.
                    </h1>
                    <p className="mt-7 text-[#5C4E3C] leading-relaxed">
                        Ingredienti di stagione, materie prime tracciate, ricette cucinate a vista.
                        Aggiungi al carrello e scegli come gustarli — al tavolo, da asporto, o a casa.
                    </p>
                </div>
            </section>

            {/* Specials banner if any */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
                <SpecialsBanner />
                <ReviewCTABanner testId="menu-top-review-banner" />
            </div>

            {/* ─── Editorial category nav (sticky) ─── */}
            <div className="sticky top-20 z-30 bg-[#F5EFE2]/95 backdrop-blur-md border-b border-[#8A5B3D]/15 mt-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
                    <nav className="flex gap-8 sm:gap-12 py-5 min-w-max justify-start sm:justify-center">
                        {categories.map((c) => (
                            <button
                                key={c.slug}
                                data-testid={`cat-tab-${c.slug}`}
                                onClick={() => setActive(c.slug)}
                                className={`relative font-serif text-lg sm:text-xl tracking-wide transition-colors whitespace-nowrap pb-1.5 ${
                                    active === c.slug
                                        ? "text-[#2C2418] italic"
                                        : "text-[#5C4E3C] hover:text-[#2C2418]"
                                }`}
                            >
                                {c.name}
                                {active === c.slug && (
                                    <span className="absolute -bottom-px left-0 right-0 h-px bg-[#8A5B3D]" />
                                )}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* ─── Items list (editorial: dotted leaders, no cards) ─── */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {activeCategory && (
                    <div className="mb-12 text-center">
                        <span className="overline text-[#8A5B3D]">— {activeCategory.name} —</span>
                        {activeCategory.description && (
                            <p className="mt-5 text-[#5C4E3C] leading-relaxed max-w-2xl mx-auto">
                                {activeCategory.description}
                            </p>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-20 text-[#5C4E3C]">Caricamento...</div>
                ) : visibleItems.length === 0 ? (
                    <div className="text-center py-20 text-[#5C4E3C] italic font-serif text-2xl">
                        Nessun piatto disponibile in questa categoria.
                    </div>
                ) : (
                    <div className="border-t border-[#8A5B3D]/15">
                        {visibleItems.map((it) => <MenuRow key={it.id} item={it} />)}
                    </div>
                )}

                {/* Allergen legend */}
                <div className="mt-14 pt-8 border-t border-[#8A5B3D]/10 text-center">
                    <p className="overline text-[#8A5B3D]/70 mb-3">Allergeni</p>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[#5C4E3C]">
                        <span><strong className="font-semibold">G</strong> Glutine</span>
                        <span><strong className="font-semibold">L</strong> Lattosio</span>
                        <span><strong className="font-semibold">E</strong> Uova</span>
                        <span><strong className="font-semibold">N</strong> Frutta a guscio</span>
                        <span><strong className="font-semibold">F</strong> Pesce</span>
                        <span><strong className="font-semibold">S</strong> Solfiti</span>
                    </div>
                </div>
            </section>

            {/* Google Review CTA */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <ReviewCTACard testId="menu-review-cta" />
            </section>
        </div>
    );
};

export default MenuPage;
