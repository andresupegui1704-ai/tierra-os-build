import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, Sprout, Heart, MessageCircle, MapPin, Clock, Navigation, Instagram } from "lucide-react";
import { api } from "../lib/api";
import SpecialsBanner from "../components/SpecialsBanner";
import { ReviewCTACard } from "../components/ReviewCTA";
import { BRAND, waLink } from "../config/brand";

const LOGO = "/brand/tierra-logo.png";
const POKE = "https://images.unsplash.com/photo-1759922222212-3657d43bd5b5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const WOOD = "https://images.unsplash.com/photo-1514944040828-c79f6cd6eb43?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";
const BANCO = "/gallery/banco.webp";
const SALA = "/gallery/sala.webp";
const FACCIATA = "/gallery/facciata.webp";
const DEHORS_1 = "/gallery/dehors-1.webp";
const DEHORS_2 = "/gallery/dehors-2.webp";
const DEHORS_3 = "/gallery/dehors-3.webp";

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
                        <img src={LOGO} alt="Tierra Organic Bistrot Café" className="h-56 sm:h-72 w-auto" />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="h-display text-4xl sm:text-5xl lg:text-6xl mt-12 text-[#2C2418] leading-[1.1]"
                    >
                        Benvenuti da <span className="italic">Tierra</span>,
                        <br/>un bistrot biologico <span className="italic">che sa di casa</span>
                        <br/>con prodotti assolutamente organici.
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="mt-8 text-lg text-[#5C4E3C] max-w-2xl mx-auto leading-relaxed"
                    >
                        Ingredienti di stagione, materie prime tracciate, ricette cucinate a vista —
                        ti aspettiamo in Via Tirso 34, a Roma.
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
                            href={waLink(BRAND.copy.whatsappShortText)}
                            target="_blank" rel="noreferrer"
                            data-testid="hero-cta-whatsapp"
                            className="btn-outline-brand"
                        >
                            <MessageCircle size={18} /> WhatsApp
                        </a>
                    </motion.div>
                </div>

                {/* INFO LOCALE — scenografica, sotto la hero */}
                <div className="border-t border-[#8A5B3D]/15 bg-[#EADFC9]/40">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
                        <div className="text-center mb-10">
                            <span className="ornament overline">Ti aspettiamo</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
                            {/* Indirizzo */}
                            <motion.a
                                href={BRAND.links.mapsDirections}
                                target="_blank" rel="noreferrer"
                                data-testid="hero-info-address"
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                                className="text-center group"
                            >
                                <MapPin size={22} strokeWidth={1.2} className="mx-auto text-[#8A5B3D] group-hover:scale-110 transition-transform" />
                                <p className="overline mt-5 text-[#8A5B3D]">Dove siamo</p>
                                <p className="font-serif text-2xl mt-3 text-[#2C2418]">{BRAND.address.street}</p>
                                <p className="text-sm text-[#5C4E3C] mt-1">{BRAND.address.city}</p>
                                <p className="text-xs mt-4 text-[#8A5B3D] underline-offset-4 group-hover:underline">Indicazioni →</p>
                            </motion.a>

                            {/* Orari */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                className="text-center md:border-x md:border-[#8A5B3D]/15 md:px-6"
                            >
                                <Clock size={22} strokeWidth={1.2} className="mx-auto text-[#8A5B3D]" />
                                <p className="overline mt-5 text-[#8A5B3D]">Orari</p>
                                <ul className="font-serif text-lg mt-3 text-[#2C2418] space-y-1">
                                    {BRAND.hours.map((h) => (
                                        <li key={h.days}>
                                            <span className="text-[#5C4E3C] text-sm font-sans tracking-wide">{h.days}</span>
                                            <span className="mx-2 text-[#8A5B3D]/40">·</span>
                                            {h.time}
                                        </li>
                                    ))}
                                </ul>
                                {BRAND.specialHours && (
                                    <p className="text-xs mt-4 text-[#7C9A4A]">
                                        {BRAND.specialHours.label} · {BRAND.specialHours.time}
                                    </p>
                                )}
                            </motion.div>

                            {/* Contatti */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="text-center"
                            >
                                <MessageCircle size={22} strokeWidth={1.2} className="mx-auto text-[#8A5B3D]" />
                                <p className="overline mt-5 text-[#8A5B3D]">Scrivici</p>
                                <a
                                    href={waLink()}
                                    target="_blank" rel="noreferrer"
                                    data-testid="hero-info-whatsapp"
                                    className="block font-serif text-2xl mt-3 text-[#2C2418] hover:text-[#7C9A4A] transition-colors"
                                >
                                    {BRAND.phone.display}
                                </a>
                                <p className="text-sm text-[#5C4E3C] mt-1">WhatsApp · telefono</p>
                                {BRAND.links.instagram && (
                                    <a
                                        href={BRAND.links.instagram}
                                        target="_blank" rel="noreferrer"
                                        data-testid="hero-info-instagram"
                                        className="inline-flex items-center gap-1.5 text-xs mt-4 text-[#8A5B3D] underline-offset-4 hover:underline"
                                    >
                                        <Instagram size={12} /> {BRAND.links.instagramHandle}
                                    </a>
                                )}
                            </motion.div>
                        </div>

                        {/* Subtle brand hallmarks — no longer masquerading as links */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="mt-14 pt-8 border-t border-[#8A5B3D]/15 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[#8A5B3D]/70"
                        >
                            {["100% Biologico", "Farm-to-table", "Ingredienti di stagione", "Poke & Ceviche"].map((t) => (
                                <span key={t} className="text-xs tracking-[0.18em] uppercase">✦ {t}</span>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* HERO v2 — Logo lockup on dark photo (a second visual moment) */}
            <section className="relative">
                <div className="relative h-[60vh] min-h-[420px] overflow-hidden">
                    <img src={DEHORS_3} alt="Il dehors di Tierra in Via Tirso al tramonto" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#2C2418]/85 via-[#2C2418]/55 to-transparent" />
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
                        <div className="max-w-xl">
                            <img src={LOGO} alt="Tierra" className="h-28 w-auto object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.35)]" />
                            <h2 className="h-display text-4xl sm:text-5xl text-[#F5EFE2] mt-8">
                                Benvenuti <span className="italic">a casa</span>.
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
            <section id="storia" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                    <div className="md:col-span-5">
                        <p className="overline">La nostra storia</p>
                        <h2 className="h-display text-4xl sm:text-5xl mt-4 text-[#2C2418]">
                            Una cucina che <span className="italic">ascolta</span> la stagione.
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

            {/* DEHORS — The outdoor experience */}
            <section id="dehors" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                    {/* Big feature: entrance + chef */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.7 }}
                        className="md:col-span-7 relative rounded-3xl overflow-hidden group"
                    >
                        <img src={FACCIATA} alt="L'ingresso di Tierra Organic Bistrot in Via Tirso 34, Roma" className="w-full h-full aspect-square md:aspect-auto object-cover group-hover:scale-[1.02] transition-transform duration-[1200ms]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2C2418]/70 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 p-8 sm:p-10 text-[#F5EFE2]">
                            <p className="overline text-[#EADFC9]">Il nostro dehors</p>
                            <h2 className="h-display text-3xl sm:text-4xl lg:text-5xl mt-3 leading-tight">
                                Sotto le <span className="italic">lanterne</span>,<br/>in Via Tirso.
                            </h2>
                        </div>
                    </motion.div>

                    {/* Supporting: two stacked photos */}
                    <div className="md:col-span-5 grid grid-rows-2 gap-6">
                        <motion.img
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.7, delay: 0.15 }}
                            src={DEHORS_1}
                            alt="Ospiti di Tierra al dehors durante l'aperitivo"
                            className="w-full h-full object-cover rounded-3xl"
                        />
                        <motion.img
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.7, delay: 0.3 }}
                            src={DEHORS_2}
                            alt="Tavoli apparecchiati al dehors di Tierra all'ora blu"
                            className="w-full h-full object-cover rounded-3xl"
                        />
                    </div>
                </div>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="mt-10 max-w-3xl text-[#5C4E3C] leading-relaxed"
                >
                    Un dehors coperto, foglie d'eucalipto essiccate, lanterne in rattan e funghi
                    riscaldanti per stare fuori tutto l'anno. Un angolo di Roma dove il tempo rallenta
                    — perfetto per una colazione lenta, un pranzo genuino o l'Aperitierra al tramonto.
                </motion.p>
            </section>

            {/* SPECIALS (appears only if admin has marked any) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SpecialsBanner />
            </div>

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
                <img src={BANCO} alt="Il banco di Tierra Organic Bistrot Café" className="w-full aspect-[4/5] object-cover rounded-3xl" />
                <div>
                    <p className="overline">Delivery · Asporto · Sul posto</p>
                    <h2 className="h-display text-4xl sm:text-5xl mt-4">
                        Ordina come <span className="italic">preferisci</span>.
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
                            Vieni a trovarci in <span className="italic">{BRAND.address.street}</span>.
                        </h2>
                        <ul className="mt-10 space-y-4 text-[#EADFC9]">
                            <li className="flex items-start gap-3"><MapPin size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" /><span>{BRAND.address.full}</span></li>
                            <li className="flex items-start gap-3"><Clock size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" /><span>{BRAND.hours.map((h) => `${h.days} ${h.time}`).join(" · ")}</span></li>
                        </ul>
                        <div className="mt-10 flex gap-3 flex-wrap">
                            <Link to="/prenota" className="btn-outline-brand" style={{color: "#F5EFE2", borderColor: "rgba(245,239,226,0.5)"}}>Prenota</Link>
                            <a href={waLink()} target="_blank" rel="noreferrer" data-testid="contact-whatsapp" className="btn-accent">
                                <MessageCircle size={18} /> WhatsApp
                            </a>
                            {BRAND.links.instagram && (
                                <a
                                    href={BRAND.links.instagram}
                                    target="_blank" rel="noreferrer"
                                    data-testid="contact-instagram"
                                    className="btn-outline-brand"
                                    style={{color: "#F5EFE2", borderColor: "rgba(245,239,226,0.5)"}}
                                >
                                    <Instagram size={18} /> Instagram
                                </a>
                            )}
                            <a
                                href={BRAND.links.mapsDirections}
                                target="_blank" rel="noreferrer"
                                data-testid="contact-directions"
                                className="btn-outline-brand"
                                style={{color: "#F5EFE2", borderColor: "rgba(245,239,226,0.5)"}}
                            >
                                <Navigation size={18} /> Indicazioni
                            </a>
                        </div>
                    </div>

                    {/* Interactive embedded map */}
                    <div className="relative rounded-3xl overflow-hidden aspect-[4/5] shadow-2xl border-4 border-[#F5EFE2]/20">
                        <iframe
                            data-testid="contact-map"
                            title={`Mappa ${BRAND.fullName} — ${BRAND.address.full}`}
                            src={BRAND.links.mapsEmbed}
                            className="absolute inset-0 w-full h-full"
                            style={{ border: 0 }}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            allowFullScreen
                        />
                    </div>
                </div>
            </section>

            {/* Google Review CTA */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                <ReviewCTACard variant="light" testId="landing-review-cta" />
            </section>
        </div>
    );
};

export default Landing;
