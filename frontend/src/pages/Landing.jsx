import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, Sprout, Heart, MessageCircle, MapPin, Clock } from "lucide-react";
import { api } from "../lib/api";

const HERO = "https://images.unsplash.com/photo-1767535313981-6a1673c0242f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1800";
const POKE = "https://images.unsplash.com/photo-1759922222212-3657d43bd5b5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const AVOCADO = "https://images.unsplash.com/photo-1638720772346-b745bcd72f5f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000";
const VEGGIES = "https://images.unsplash.com/photo-1757332051150-a5b3c4510af8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1000";

const Pillar = ({ icon: Icon, title, children }) => (
    <div className="p-8 rounded-2xl bg-[#F1EBE1] hover:bg-white transition-colors border border-transparent hover:border-[#2B4A33]/15">
        <Icon size={28} strokeWidth={1.3} className="text-[#C46D46]" />
        <h3 className="font-serif text-2xl mt-5 text-[#1C231A]">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-[#515E4C]">{children}</p>
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
        <div data-testid="landing-page" className="bg-[#F9F6F0]">
            {/* HERO — asymmetric editorial */}
            <section className="relative pt-20 lg:pt-24 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 lg:pt-16 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="lg:col-span-7"
                    >
                        <p className="overline">Via Tirso 34 · Roma</p>
                        <h1 className="h-display text-5xl sm:text-7xl lg:text-8xl mt-6 text-[#1C231A]">
                            La <span className="italic text-[#C46D46]">terra</span> nel piatto,
                            <br className="hidden sm:block" /> con grazia.
                        </h1>
                        <p className="mt-8 text-lg text-[#515E4C] max-w-xl leading-relaxed">
                            Un bistrot biologico che celebra gli ingredienti di stagione, le materie prime tracciate
                            e la cucina lenta. Poke bowls, ceviche, colazioni artigianali e aperitivi d'autore.
                        </p>
                        <div className="mt-10 flex flex-wrap gap-4">
                            <Link to="/menu" data-testid="hero-cta-menu" className="btn-brand">
                                Esplora il menù <ArrowRight size={18} />
                            </Link>
                            <Link to="/prenota" data-testid="hero-cta-reserve" className="btn-outline-brand">
                                Prenota un tavolo
                            </Link>
                            <a
                                href="https://wa.me/393479915420?text=Ciao%20Tierra!"
                                target="_blank" rel="noreferrer"
                                data-testid="hero-cta-whatsapp"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[#2B4A33] hover:text-[#C46D46] transition-colors"
                            >
                                <MessageCircle size={18} /> WhatsApp
                            </a>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="lg:col-span-5 relative"
                    >
                        <div className="relative aspect-[4/5] rounded-3xl overflow-hidden">
                            <img src={HERO} alt="Tierra Organic Bistro" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1C231A]/35 to-transparent" />
                        </div>
                        <div className="hidden lg:block absolute -left-20 bottom-8 w-56 aspect-square rounded-2xl overflow-hidden shadow-2xl ring-4 ring-[#F9F6F0]">
                            <img src={POKE} alt="Poke bowl" className="w-full h-full object-cover" />
                        </div>
                    </motion.div>
                </div>

                {/* Marquee-like ticker */}
                <div className="border-y border-[#2B4A33]/15 bg-[#F1EBE1]/70 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap justify-center gap-x-12 gap-y-2 text-[#515E4C]">
                        {["100% biologico", "Farm-to-table", "Ingredienti di stagione", "Poke & Ceviche", "Aperitierra"].map((t) => (
                            <span key={t} className="overline">• {t}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* STORIA */}
            <section id="storia" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                    <div className="md:col-span-5">
                        <p className="overline">La nostra storia</p>
                        <h2 className="h-display text-4xl sm:text-5xl mt-4 text-[#1C231A]">
                            Una cucina che <span className="italic text-[#C46D46]">ascolta</span> la terra.
                        </h2>
                    </div>
                    <div className="md:col-span-7 md:col-start-7">
                        <p className="text-lg text-[#515E4C] leading-relaxed">
                            Nasce da un'idea semplice: cucinare bene, con ingredienti veri. Al Tierra Organic Bistro
                            scegliamo piccoli produttori locali, farine biologiche, pesce del giorno e verdure di stagione.
                        </p>
                        <p className="mt-6 text-[#515E4C] leading-relaxed">
                            Dal brunch all'aperitivo, ogni piatto è pensato per farti stare bene — senza rinunciare al gusto.
                            Ci trovi a due passi dal centro, in un'atmosfera calma, luminosa, accogliente.
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
                        Lavoriamo con piccoli produttori italiani per ridurre sprechi e km alimentari.
                    </Pillar>
                    <Pillar icon={Heart} title="Ricette d'autore">
                        Poke bowls, ceviche, taglieri artigianali e dolci fatti in casa, ogni giorno.
                    </Pillar>
                </div>
            </section>

            {/* FEATURED DISHES */}
            <section className="bg-[#F1EBE1]/60 py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
                        <div>
                            <p className="overline">Il meglio del menù</p>
                            <h2 className="h-display text-4xl sm:text-5xl mt-4">Piatti del momento</h2>
                        </div>
                        <Link to="/menu" data-testid="view-full-menu" className="btn-outline-brand">Vedi il menù completo <ArrowRight size={16} /></Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {featured.map((it) => (
                            <Link key={it.id} to="/menu" data-testid={`featured-${it.id}`} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                                {it.image_url && <div className="aspect-[4/3] overflow-hidden"><img src={it.image_url} alt={it.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /></div>}
                                <div className="p-6">
                                    {it.badge && <span className="overline text-[#C46D46]">{it.badge}</span>}
                                    <h3 className="font-serif text-2xl mt-2">{it.name}</h3>
                                    <div className="mt-3 flex justify-between items-center">
                                        <p className="text-sm text-[#515E4C] line-clamp-2">{it.description}</p>
                                        <span className="font-serif text-xl text-[#2B4A33] ml-4">€ {it.price.toFixed(2)}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* DUAL IMAGE BLOCK */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid grid-cols-1 md:grid-cols-2 gap-6">
                <img src={AVOCADO} alt="Colazione biologica" className="w-full aspect-[4/5] object-cover rounded-2xl" />
                <div className="flex flex-col justify-center">
                    <p className="overline">Delivery · Asporto · Sul posto</p>
                    <h2 className="h-display text-4xl sm:text-5xl mt-4">
                        Ordina come <span className="italic text-[#C46D46]">preferisci</span>.
                    </h2>
                    <p className="mt-6 text-[#515E4C] leading-relaxed">
                        Preferisci mangiare comodamente a casa? Fare un salto veloce a ritirare?
                        O prenotare un tavolo e trovare il tuo ordine pronto? Scegli tu. Noi ci pensiamo.
                    </p>
                    <div className="mt-8 flex gap-3 flex-wrap">
                        <Link to="/menu" data-testid="home-order-cta" className="btn-brand">Ordina ora</Link>
                        <Link to="/prenota" data-testid="home-reserve-cta" className="btn-outline-brand">Prenota un tavolo</Link>
                    </div>
                </div>
            </section>

            {/* CONTATTI / MAPPA */}
            <section className="bg-[#2B4A33] text-[#F9F6F0] py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <p className="overline text-[#C46D46]">Ti aspettiamo</p>
                        <h2 className="h-display text-4xl sm:text-5xl mt-4">
                            Vieni a trovarci in <span className="italic">Via Tirso 34</span>.
                        </h2>
                        <ul className="mt-10 space-y-4 text-[#F1EBE1]/90">
                            <li className="flex items-start gap-3"><MapPin size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" /><span>Via Tirso 34, Roma</span></li>
                            <li className="flex items-start gap-3"><Clock size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" /><span>Lun – Ven 08:00 – 23:00 · Sab – Dom 09:00 – 23:30</span></li>
                        </ul>
                        <div className="mt-10 flex gap-4 flex-wrap">
                            <Link to="/prenota" className="btn-outline-brand" style={{color: "#F9F6F0", borderColor: "rgba(249,246,240,0.35)"}}>Prenota</Link>
                            <a href="https://wa.me/393479915420" target="_blank" rel="noreferrer" data-testid="contact-whatsapp" className="btn-brand" style={{background: "#C46D46"}}>
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
