import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import MenuCard from "../components/MenuCard";

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
        </div>
    );
};

export default MenuPage;
