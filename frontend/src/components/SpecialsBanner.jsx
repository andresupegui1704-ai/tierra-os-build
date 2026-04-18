import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { api } from "../lib/api";

/**
 * Banner "Special del Giorno" — mostra fino a 4 piatti con grafica dedicata.
 * Si auto-nasconde se non ci sono specials.
 */
const SpecialsBanner = ({ compact = false }) => {
    const [items, setItems] = useState([]);

    useEffect(() => {
        api.get("/menu/specials").then((r) => setItems(r.data)).catch(() => {});
    }, []);

    if (items.length === 0) return null;

    return (
        <section
            data-testid="specials-banner"
            className={`relative overflow-hidden ${compact ? "" : "my-12"}`}
        >
            <div className="relative rounded-3xl overflow-hidden"
                 style={{ background: "linear-gradient(135deg, #2C2418 0%, #3D2E1F 55%, #4A3827 100%)" }}>
                {/* Deco grain + sparkles */}
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: "radial-gradient(circle at 20% 20%, rgba(200,155,60,0.35) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(124,154,74,0.25) 0%, transparent 50%)"
                }} />

                <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-12">
                    <div className="flex items-end justify-between flex-wrap gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="inline-flex items-center gap-2 mb-3">
                                <Sparkles size={14} className="text-[#E6C067]" />
                                <span className="text-[11px] tracking-[0.3em] uppercase text-[#E6C067] font-semibold">Special del Giorno</span>
                                <Sparkles size={14} className="text-[#E6C067]" />
                            </div>
                            <h2 className="h-display text-4xl sm:text-5xl text-[#F5EFE2]">
                                I piatti <span className="italic text-[#E6C067]">del giorno</span>
                            </h2>
                            <p className="mt-3 text-[#EADFC9]/75 max-w-lg text-sm">
                                Selezione di stagione dello chef. Cambia ogni giorno, scegli prima che finisca.
                            </p>
                        </motion.div>
                        <Link to="/menu" data-testid="specials-view-all" className="btn-accent" style={{ background: "#C89B3C" }}>
                            Ordina ora <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className={`mt-10 grid gap-5 ${items.length === 1 ? "grid-cols-1" : items.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
                        {items.map((it, idx) => (
                            <motion.article
                                key={it.id}
                                data-testid={`special-card-${it.id}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.55, delay: idx * 0.08 }}
                                className="relative bg-[#F5EFE2] rounded-2xl overflow-hidden group hover:-translate-y-1 transition-transform shadow-xl"
                            >
                                {/* Gold ribbon */}
                                <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 bg-[#C89B3C] text-[#2C2418] text-[10px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full shadow-lg">
                                    <Sparkles size={10} strokeWidth={2.5} /> Special
                                </div>
                                {it.image_url ? (
                                    <div className="aspect-square overflow-hidden">
                                        <img src={it.image_url} alt={it.image_alt || it.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    </div>
                                ) : (
                                    <div className="aspect-square bg-gradient-to-br from-[#EADFC9] to-[#D8C7A8] flex items-center justify-center">
                                        <span className="font-serif italic text-5xl text-[#8A5B3D]/40">Tierra</span>
                                    </div>
                                )}
                                <div className="p-5">
                                    <h3 className="font-serif text-xl text-[#2C2418] leading-tight">{it.name}</h3>
                                    {it.description && <p className="mt-2 text-xs text-[#5C4E3C] leading-relaxed line-clamp-2">{it.description}</p>}
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="font-serif text-lg text-[#8A6A14]">€ {it.price.toFixed(2)}</span>
                                        <Link to="/menu" className="text-xs text-[#8A5B3D] hover:text-[#6F4527] tracking-widest uppercase font-semibold">Ordina →</Link>
                                    </div>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SpecialsBanner;
