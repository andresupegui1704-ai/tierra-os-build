import React, { useEffect, useState } from "react";
import { Star, ArrowUpRight } from "lucide-react";
import { api } from "../lib/api";
import MenuCard from "../components/MenuCard";
import SpecialsBanner from "../components/SpecialsBanner";

const GOOGLE_REVIEW_URL = "https://share.google/eVhM03mToB5eMlaWw";

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
    }, []);

    const activeCategory = categories.find((c) => c.slug === active);
    const visibleItems = items.filter((i) => i.category_slug === active);

    return (
        <div data-testid="menu-page" className="bg-[#F5EFE2] min-h-screen pt-24">
            {/* Header */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
                <p className="overline">Il nostro menù</p>
                <h1 className="h-display text-5xl sm:text-7xl mt-5">Ogni piatto, una <span className="italic text-[#8A5B3D]">storia</span>.</h1>
                <p className="mt-6 text-[#5C4E3C] max-w-2xl">
                    Sfoglia le categorie, aggiungi al carrello e scegli se ritirare, farti consegnare, o trovarlo pronto al tavolo.
                </p>
            </section>

            {/* Specials banner if any */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SpecialsBanner />
            </div>

            {/* Category tabs */}
            <div className="sticky top-20 z-30 bg-[#F5EFE2]/90 backdrop-blur-md border-y border-[#8A5B3D]/15">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
                    <div className="flex gap-2 py-4 min-w-max">
                        {categories.map((c) => (
                            <button
                                key={c.slug}
                                data-testid={`cat-tab-${c.slug}`}
                                onClick={() => setActive(c.slug)}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium tracking-wide transition-colors whitespace-nowrap ${
                                    active === c.slug
                                        ? "bg-[#7C9A4A] text-[#FFFDF7]"
                                        : "bg-transparent text-[#5C4E3C] hover:bg-[#EADFC9] hover:text-[#2C2418] border border-[#8A5B3D]/25"
                                }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Items grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                {activeCategory && (
                    <div className="mb-10 max-w-3xl">
                        <h2 className="h-display text-3xl sm:text-4xl">{activeCategory.name}</h2>
                        {activeCategory.description && (
                            <p className="mt-3 text-[#5C4E3C] leading-relaxed">{activeCategory.description}</p>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {visibleItems.map((it) => <MenuCard key={it.id} item={it} />)}
                    </div>
                )}
            </section>

            {/* Google Review CTA */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#EADFC9] via-[#F5EFE2] to-[#E4D3A9] border border-[#8A5B3D]/15 px-6 py-10 sm:px-12 sm:py-14">
                    {/* Decorative stars */}
                    <div className="absolute -top-8 -right-8 opacity-30 rotate-12">
                        <Star size={120} strokeWidth={0.8} className="text-[#C9A94E] fill-[#C9A94E]/20" />
                    </div>
                    <div className="absolute -bottom-10 -left-6 opacity-20 -rotate-12">
                        <Star size={90} strokeWidth={0.8} className="text-[#C9A94E] fill-[#C9A94E]/20" />
                    </div>

                    <div className="relative">
                        <div className="flex items-center gap-1 text-[#C9A94E] mb-4">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={18} strokeWidth={1.4} className="fill-[#C9A94E]" />
                            ))}
                        </div>
                        <p className="overline text-[#8A5B3D]">Ti è piaciuto?</p>
                        <h2 className="h-display text-3xl sm:text-4xl lg:text-5xl mt-4 text-[#2C2418] leading-tight max-w-2xl">
                            Lascia una <span className="italic text-[#8A5B3D]">recensione</span> su Google — ti offriamo un dolce pensiero.
                        </h2>
                        <p className="mt-6 text-[#5C4E3C] leading-relaxed max-w-2xl">
                            Se sei stato bene, diccelo e aiutaci a crescere. Ti regaleremo <strong>uno dei nostri biscotti artigianali</strong> — un piccolo grazie per il tuo tempo.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <a
                                href={GOOGLE_REVIEW_URL}
                                target="_blank"
                                rel="noreferrer"
                                data-testid="menu-google-review-cta"
                                className="inline-flex items-center gap-3 rounded-full bg-[#2C2418] hover:bg-[#3A2F20] text-[#F5EFE2] px-7 py-4 text-sm font-medium tracking-wide transition-all hover:scale-[1.02] shadow-[0_8px_24px_-8px_rgba(44,36,24,0.4)]"
                            >
                                <GoogleG />
                                Scrivi una recensione
                                <ArrowUpRight size={16} strokeWidth={2} />
                            </a>
                            <span className="text-xs text-[#8A7A62] italic">
                                Mostraci lo screenshot in cassa · pensiamo noi al biscotto
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const GoogleG = () => (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
);

export default MenuPage;
