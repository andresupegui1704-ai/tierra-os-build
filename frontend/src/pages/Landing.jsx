import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, Sprout, Heart, MessageCircle, MapPin, Clock } from "lucide-react";
import { api } from "../lib/api";

const LOGO = "/brand/tierra-logo.jpg";
const POKE = "https://images.unsplash.com/photo-1759922222212-3657d43bd5b5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const WOOD = "https://images.unsplash.com/photo-1514944040828-c79f6cd6eb43?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";
const AVOCADO = "https://images.unsplash.com/photo-1638720772346-b745bcd72f5f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const VEGGIES = "https://images.unsplash.com/photo-1757332051150-a5b3c4510af8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const INTERIOR = "https://images.unsplash.com/photo-1552566626-52f8b828add9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400";

const Pillar = ({ icon: Icon, title, children }) => (
    <div className="p-8 rounded-2xl bg-[#FFFDF7] border border-[#8A5B3D]/10 hover:border-[#8A5B3D]/30 transition-colors">
        <Icon size={28} strokeWidth={1.3} className="text-[#8A5B3D]" />
        <h3 className="font-serif text-2xl mt-5 text-[#2C2418]">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-[#5C4E3C]">{children}</p>
    </div>
);

const Landing = () => {
    const [featured, setFeatured] = useState([]);

    useEffect(() => {
        api.get("/menu/items", { params: { category: "pranzo-cena", only_available: true } })
            .then((r) => setFeatured(r.data.slice(0, 3)))
            .catch(() => {});
    }, []);

    return (
        <div data-testid="landing-page">
            {/* HERO v1 — Logo as centrepiece (bistrot/ristorante feel) */}
            <section className="relative overflow-hidden paper-texture pt-20">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                        <span className="ornament overline">Dal 2019 · Roma</span>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="mt-10 flex justify-center"
                    >
                        <div className="logo-stamp">
                            <img src={LOGO} alt="Tierra Organic Bistrot Café" className="h-56 sm:h-72 w-auto" />
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="h-display text-5xl sm:text-6xl lg:text-7xl mt-12 text-[#2C2418]"
                    >
                        La cucina <span className="italic text-[#8A5B3D]">biologica</span>
                        <br/>che sa di <span className="italic text-[#7C9A4A]">casa</span>.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="mt-8 text-lg text-[#5C4E3C] max-w-2xl mx-auto leading-relaxed"
                    >
                        Un bistrot & caffetteria biologico in Via Tirso 34. Ogni piatto è una piccola celebrazione
                        della terra — ingredienti di stagione, materie prime tracciate, ricette cucinate a vista.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.9 }}
                        className="mt-10 flex flex-wrap justify-center gap-4"
                    >
                        <Link to="/menu" data-testid="hero-cta-menu" className="btn-brand">
                            Ordina dal menù <ArrowRight size={18} />
                        </Link>
                        <Link to="/prenota" data-testid="hero-cta-reserve" className="btn-accent">
                            Prenota un tavolo
                        </Link>
                        <a
                            href="https://wa.me/393479915420?text=Ciao%20Tierra!"
                            target="_blank" rel="noreferrer"
                            data-testid="hero-cta-whatsapp"
                            className="btn-outline-brand"
                        >
                            <MessageCircle size={18} /> WhatsApp
                        </a>
                    </motion.div>
                </div>

                {/* Ticker bar */}
                <div className="border-y border-[#8A5B3D]/20 bg-[#EADFC9]/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap justify-center gap-x-10 gap-y-2">
                        {["100% biologico", "Farm-to-table", "Ingredienti di stagione", "Poke & Ceviche", "Aperitierra 18 – 20"].map((t) => (
                            <span key={t} className="overline">✦ {t}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* HERO v2 — Logo lockup on dark photo (a second visual moment) */}
            <section className="relative">
                <div className="relative h-[60vh] min-h-[420px] overflow-hidden">
                    <img src={INTERIOR} alt="Interni Tierra" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#2C2418]/85 via-[#2C2418]/55 to-transparent" />
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
                        <div className="max-w-xl">
                            <div className="inline-flex items-center gap-4 bg-[#F5EFE2] rounded-2xl p-3 shadow-2xl">
                                <img src={LOGO} alt="Tierra" className="h-16 w-16 object-contain" />
                                <div className="pr-4">
                                    <p className="font-serif text-lg text-[#7C9A4A] leading-none">Tierra</p>
                                    <p className="text-[9px] tracking-[0.3em] uppercase text-[#8A5B3D] mt-1">organic · bistrot · cafè</p>
                                </div>
                            </div>
                            <h2 className="h-display text-4xl sm:text-5xl text-[#F5EFE2] mt-8">
                                Benvenuti a casa <br/><span className="italic">della terra</span>.
                            </h2>
                            <p className="mt-5 text-[#EADFC9]/90 leading-relaxed">
                                Colazioni lente, pranzi genuini, aperitivi al profumo di pomodoro fresco.
                                Ti aspettiamo in Via Tirso 34.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* STORIA */}
            <section id="storia" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                    <div className="md:col-span-5">
                        <p className="overline">La nostra storia</p>
                        <h2 className="h-display text-4xl sm:text-5xl mt-4 text-[#2C2418]">
                            Una cucina che <span className="italic text-[#8A5B3D]">ascolta</span> la terra.
                        </h2>
                    </div>
                    <div className="md:col-span-7 md:col-start-7">
                        <p className="text-lg text-[#5C4E3C] leading-relaxed">
                            Tierra nasce da un'idea semplice: cucinare bene, con ingredienti veri. Scegliamo piccoli
                            produttori locali, farine biologiche, pesce del giorno e verdure di stagione.
                        </p>
                        <p className="mt-6 text-[#5C4E3C] leading-relaxed">
                            Dalla colazione all'aperitivo, ogni piatto è pensato per farti stare bene —
                            senza mai rinunciare al gusto. Ci trovi a due passi dal centro, in un'atmosfera
                            calma, luminosa, accogliente.
                        </p>
                    </div>
                </div>
            </section>

            {/* PILLARS */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Pillar icon={Leaf} title="100% Biologico">
                        Ingredienti certificati, coltivati senza pesticidi. Trasparenza su ogni piatto.
                    </Pillar>
                    <Pillar icon={Sprout} title="Filiera corta">
                        Lavoriamo con piccoli produttori italiani per ridurre sprechi e chilometri.
                    </Pillar>
                    <Pillar icon={Heart} title="Ricette d'autore">
                        Poke bowls, ceviche, taglieri artigianali, dolci da forno fatti in casa ogni mattina.
                    </Pillar>
                </div>
            </section>

            {/* FEATURED DISHES */}
            <section className="warm-gradient py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
                        <div>
                            <p className="overline">Dal nostro menù</p>
                            <h2 className="h-display text-4xl sm:text-5xl mt-4">Piatti del momento</h2>
                        </div>
                        <Link to="/menu" data-testid="view-full-menu" className="btn-outline-brand">
                            Menù completo <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {featured.map((it) => (
                            <Link key={it.id} to="/menu" data-testid={`featured-${it.id}`} className="group bg-[#FFFDF7] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-[#8A5B3D]/10">
                                {it.image_url && <div className="aspect-[4/3] overflow-hidden"><img src={it.image_url} alt={it.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /></div>}
                                <div className="p-6">
                                    {it.badge && <span className="overline">{it.badge}</span>}
                                    <h3 className="font-serif text-2xl mt-2">{it.name}</h3>
                                    <div className="mt-3 flex justify-between items-center">
                                        <p className="text-sm text-[#5C4E3C] line-clamp-2">{it.description}</p>
                                        <span className="font-serif text-xl text-[#7C9A4A] ml-4">€ {it.price.toFixed(2)}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* DUAL IMAGE BLOCK */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <img src={AVOCADO} alt="Colazione biologica" className="w-full aspect-[4/5] object-cover rounded-3xl" />
                <div>
                    <p className="overline">Delivery · Asporto · Sul posto</p>
                    <h2 className="h-display text-4xl sm:text-5xl mt-4">
                        Ordina come <span className="italic text-[#8A5B3D]">preferisci</span>.
                    </h2>
                    <p className="mt-6 text-[#5C4E3C] leading-relaxed">
                        Preferisci mangiare a casa? Fare un salto veloce a ritirare? O prenotare un tavolo
                        e trovare il tuo ordine pronto al tuo arrivo? Scegli tu. Ci pensiamo noi.
                    </p>
                    <div className="mt-8 flex gap-3 flex-wrap">
                        <Link to="/menu" data-testid="home-order-cta" className="btn-brand">Ordina ora</Link>
                        <Link to="/prenota" data-testid="home-reserve-cta" className="btn-outline-brand">Prenota un tavolo</Link>
                    </div>
                </div>
            </section>

            {/* CONTATTI */}
            <section className="bg-[#7C9A4A]/95 text-[#F5EFE2] py-24 relative overflow-hidden">
                <img src={WOOD} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 mix-blend-overlay" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <p className="overline text-[#EADFC9]">Ti aspettiamo</p>
                        <h2 className="h-display text-4xl sm:text-5xl mt-4">
                            Vieni a trovarci in <span className="italic">Via Tirso 34</span>.
                        </h2>
                        <ul className="mt-10 space-y-4 text-[#EADFC9]">
                            <li className="flex items-start gap-3"><MapPin size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" /><span>Via Tirso 34, Roma</span></li>
                            <li className="flex items-start gap-3"><Clock size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" /><span>Lun – Ven 08:00 – 23:00 · Sab – Dom 09:00 – 23:30</span></li>
                        </ul>
                        <div className="mt-10 flex gap-4 flex-wrap">
                            <Link to="/prenota" className="btn-outline-brand" style={{color: "#F5EFE2", borderColor: "rgba(245,239,226,0.5)"}}>Prenota</Link>
                            <a href="https://wa.me/393479915420" target="_blank" rel="noreferrer" data-testid="contact-whatsapp" className="btn-accent">
                                <MessageCircle size={18} /> WhatsApp
                            </a>
                        </div>
                    </div>
                    <img src={VEGGIES} alt="Verdure organiche" className="w-full aspect-[4/5] object-cover rounded-3xl" />
                </div>
            </section>
        </div>
    );
};

export default Landing;
