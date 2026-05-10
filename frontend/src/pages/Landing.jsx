import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sprout, Heart, Leaf } from "lucide-react";
import { api } from "../lib/api";
import EditorialHero from "../components/EditorialHero";
import ChefDiary from "../components/ChefDiary";
import SpecialsBanner from "../components/SpecialsBanner";
import { ReviewCTACard } from "../components/ReviewCTA";
import PressSection from "../components/PressSection";
import SEO, { restaurantSchema, faqSchema } from "../components/SEO";
import { BRAND } from "../config/brand";

const DEHORS_1 = "/gallery/dehors-1.webp";
const DEHORS_2 = "/gallery/dehors-2.webp";
const DEHORS_3 = "/gallery/dehors-3.webp";

const valori = [
    {
        n: "i.",
        title: "Biologico, davvero",
        body: "Frutta, verdura e farine certificate. Lavoriamo solo con produttori che possiamo nominare per nome.",
        icon: Sprout,
    },
    {
        n: "ii.",
        title: "Cucina di stagione",
        body: "Il menu cambia con la natura. Quello che ordini oggi non è detto che ci sia il mese prossimo.",
        icon: Leaf,
    },
    {
        n: "iii.",
        title: "Casa, prima che locale",
        body: "Niente pretese, niente fretta. Una cucina che ti accoglie e ti dà tempo di stare.",
        icon: Heart,
    },
];

const Landing = () => {
    const [featured, setFeatured] = useState([]);

    useEffect(() => {
        api.get("/menu/items")
            .then((r) => {
                // Pick 3 items that have a real (non-placeholder) image
                const withPhoto = r.data.filter(
                    (it) => it.image_url && !/unsplash\.com/i.test(it.image_url)
                );
                setFeatured(withPhoto.slice(0, 3));
            })
            .catch(() => {});
    }, []);

    return (
        <div data-testid="landing-page" className="bg-tierra-bg text-tierra-ink">
            <SEO
                title="Tierra Organic Bistrot Roma | Bio · Parioli · Via Tirso 34"
                description="Tierra è il bistrot biologico di Roma nel quartiere Parioli-Trieste. Poke bowl, avocado toast, colazione bio, aperitivo con dehor su Via Tirso 34. Prodotti 100% biologici. Aperto Lun–Dom."
                path="/"
                schemas={[restaurantSchema(), faqSchema()]}
                breadcrumbs={[{ name: "Home", path: "/" }]}
            />

            {/* ═══ 01 — EDITORIAL HERO ═══ */}
            <EditorialHero />

            {/* Specials banner (if any) */}
            <div className="max-w-screen-xl mx-auto px-6 lg:px-12 mt-4">
                <SpecialsBanner />
            </div>

            {/* ═══ 02 — DAL TACCUINO DELLO CHEF ═══ */}
            <ChefDiary />

            {/* ═══ 03 — TRE VALORI (NUMBERED) ═══ */}
            <section className="bg-tierra-bg py-24 sm:py-32">
                <div className="max-w-screen-xl mx-auto px-6 lg:px-12">
                    <div className="flex items-baseline gap-5 mb-14">
                        <span className="mag-number text-6xl sm:text-7xl">03</span>
                        <span className="h-px w-20 bg-tierra-ink/30 mb-3" />
                        <span className="overline">Tre principi</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
                        {valori.map((v, i) => (
                            <motion.div
                                key={v.n}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: i * 0.1 }}
                                className="relative"
                            >
                                <span className="font-display italic text-5xl text-tierra-brand">{v.n}</span>
                                <h3 className="h-mag text-3xl mt-6 text-tierra-ink leading-tight">
                                    {v.title}
                                </h3>
                                <p className="mt-4 text-tierra-ink2 leading-relaxed">
                                    {v.body}
                                </p>
                                <v.icon size={22} strokeWidth={1.2} className="text-tierra-sage mt-6" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ 04 — FEATURED DISHES (MAGAZINE GALLERY) ═══ */}
            {featured.length > 0 && (
                <section className="bg-tierra-bgAlt py-24 sm:py-32">
                    <div className="max-w-screen-xl mx-auto px-6 lg:px-12">
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
                            <div>
                                <div className="flex items-baseline gap-5 mb-6">
                                    <span className="mag-number text-6xl sm:text-7xl">04</span>
                                    <span className="h-px w-20 bg-tierra-ink/30 mb-3" />
                                    <span className="overline">Dalla cucina</span>
                                </div>
                                <h2 className="h-display text-4xl sm:text-6xl text-tierra-ink leading-tight max-w-2xl">
                                    Le scelte di <span className="italic text-tierra-brand">questa settimana</span>.
                                </h2>
                            </div>
                            <Link
                                to="/menu"
                                data-testid="featured-see-menu"
                                className="link-italic inline-flex items-center gap-2 text-tierra-ink underline underline-offset-8 decoration-tierra-brand/40 hover:decoration-tierra-brand"
                            >
                                Vedi il menu completo
                                <ArrowRight size={16} />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
                            {featured.map((it, i) => (
                                <motion.article
                                    key={it.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: i * 0.1 }}
                                    className={`group ${i === 1 ? "md:mt-12" : ""}`}
                                >
                                    <div className="aspect-[4/5] bg-tierra-paper overflow-hidden mb-5">
                                        <img
                                            src={it.image_url}
                                            alt={it.name}
                                            className="w-full h-full object-contain p-2 group-hover:scale-[1.03] transition-transform duration-700"
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="flex items-baseline justify-between gap-3">
                                        <h3 className="font-display text-2xl text-tierra-ink">{it.name}</h3>
                                        <span className="font-display italic text-xl text-tierra-brand tabular-nums shrink-0">
                                            € {Number(it.price).toFixed(2)}
                                        </span>
                                    </div>
                                    {it.description && (
                                        <p className="mt-2 text-sm text-tierra-ink2 leading-relaxed line-clamp-2">
                                            {it.description}
                                        </p>
                                    )}
                                </motion.article>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ═══ 05 — IL DEHORS ═══ */}
            <section className="bg-tierra-bg py-24 sm:py-32">
                <div className="max-w-screen-xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
                    <div className="lg:col-span-5">
                        <div className="flex items-baseline gap-5 mb-6">
                            <span className="mag-number text-6xl sm:text-7xl">05</span>
                            <span className="h-px w-20 bg-tierra-ink/30 mb-3" />
                            <span className="overline">Il nostro dehors</span>
                        </div>
                        <h2 className="h-display text-4xl sm:text-5xl text-tierra-ink leading-tight">
                            Mangiare all'aperto,<br/>
                            <span className="italic text-tierra-brand">come a casa.</span>
                        </h2>
                        <p className="mt-8 text-tierra-ink2 leading-relaxed">
                            Sei tavoli sotto le piante, lampade morbide la sera. Un piccolo
                            angolo di Roma dove il tempo rallenta.
                        </p>
                        <Link
                            to="/prenota"
                            data-testid="dehors-reserve-cta"
                            className="mt-10 inline-flex items-center gap-3 px-7 py-4 border border-tierra-ink hover:bg-tierra-ink hover:text-tierra-bg transition-colors text-sm tracking-wide"
                        >
                            Prenota un tavolo all'aperto
                            <ArrowRight size={16} />
                        </Link>
                    </div>

                    {/* Asymmetric photo grid */}
                    <div className="lg:col-span-7 grid grid-cols-12 gap-3 sm:gap-5">
                        <div className="col-span-8 aspect-[4/5] overflow-hidden">
                            <img src={DEHORS_1} alt="Dehors Tierra" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                        </div>
                        <div className="col-span-4 flex flex-col gap-3 sm:gap-5">
                            <div className="aspect-square overflow-hidden">
                                <img src={DEHORS_2} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                            </div>
                            <div className="aspect-square overflow-hidden">
                                <img src={DEHORS_3} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ 06 — COME ORDINARE ═══ */}
            <section className="bg-tierra-olive text-tierra-bg py-24 sm:py-32 relative overflow-hidden">
                <div className="max-w-screen-xl mx-auto px-6 lg:px-12">
                    <div className="flex items-baseline gap-5 mb-12">
                        <span className="mag-number text-6xl sm:text-7xl text-tierra-bg/40">06</span>
                        <span className="h-px w-20 bg-tierra-bg/30 mb-3" />
                        <span className="overline text-tierra-bg/70">Come ordinare</span>
                    </div>

                    <h2 className="h-display text-4xl sm:text-6xl mb-16 max-w-3xl">
                        Ordina come<br/>
                        <span className="italic">preferisci.</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
                        {[
                            { n: "01", title: "Al tavolo", body: "Scannerizza il QR, scegli, ricevi tutto in cucina senza alzarti." },
                            { n: "02", title: "D'asporto", body: "Prepariamo per quando passi. Pronto in 15–20 minuti." },
                            { n: "03", title: "A domicilio", body: "Consegne in zona Salario, Trieste, Nomentano in bici elettrica." },
                        ].map((s, i) => (
                            <motion.div
                                key={s.n}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: i * 0.1 }}
                                className="border-t border-tierra-bg/30 pt-6"
                            >
                                <span className="font-display italic text-3xl text-tierra-bg/60">{s.n}</span>
                                <h3 className="h-mag text-3xl mt-3">{s.title}</h3>
                                <p className="mt-3 text-tierra-bg/80 leading-relaxed">{s.body}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-16 flex flex-wrap gap-4">
                        <Link
                            to="/menu"
                            data-testid="order-cta-menu"
                            className="inline-flex items-center gap-3 px-7 py-4 bg-tierra-brand text-tierra-bg hover:bg-tierra-brandHover transition-colors text-sm tracking-wide"
                        >
                            Vai al menu
                            <ArrowRight size={16} />
                        </Link>
                        <a
                            href={BRAND.links.mapsDirections}
                            target="_blank" rel="noreferrer"
                            data-testid="order-cta-directions"
                            className="link-italic inline-flex items-center gap-2 underline underline-offset-8 decoration-tierra-bg/40 hover:decoration-tierra-bg text-sm"
                        >
                            Vieni a trovarci
                        </a>
                    </div>
                </div>
            </section>

            {/* ═══ 07 — GOOGLE REVIEW CTA ═══ */}
            <section className="max-w-screen-xl mx-auto px-6 lg:px-12 py-24">
                <ReviewCTACard testId="landing-review-cta" />
            </section>

            {/* ═══ PRESS & RICONOSCIMENTI (LLM authority signals) ═══ */}
            <PressSection />

            {/* ═══ SEO SEMANTIC FOOTER — for LLM/AI crawlers ═══ */}
            <section
                aria-label="Chi siamo"
                className="bg-tierra-bgDeep py-20 border-t border-tierra-ink/10"
            >
                <div className="max-w-screen-xl mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                    <article>
                        <h2 className="overline mb-5">Chi siamo</h2>
                        <p className="font-display text-2xl text-tierra-ink leading-snug mb-5">
                            Tierra Organic Bistrot
                        </p>
                        <p className="text-tierra-ink2 leading-relaxed text-sm">
                            Tierra Organic Bistrot è un bistrot biologico certificato aperto dal 2019 a Roma,
                            in Via Tirso 34, nel quartiere Trieste-Parioli. Tutti gli ingredienti sono
                            certificati biologici e selezionati da fornitori locali del Lazio. Il menù propone
                            colazione biologica, poke bowl personalizzabili con proteine a scelta
                            (carne, pesce, vegan), piatti del giorno con prodotti di stagione, e l'Aperitierra
                            dalle 18:00. Il locale dispone di un dehor esterno con sedie da bistrot, piante e
                            lampade in rattan — una delle terrazze più apprezzate del quartiere. Tierra è
                            aperto tutti i giorni.
                        </p>
                    </article>
                    <article lang="en">
                        <h2 className="overline mb-5">About us</h2>
                        <p className="font-display text-2xl text-tierra-ink leading-snug mb-5">
                            English summary
                        </p>
                        <p className="text-tierra-ink2 leading-relaxed text-sm">
                            Tierra Organic Bistrot is a certified organic restaurant in Rome, located at
                            Via Tirso 34 in the Parioli-Trieste neighbourhood. Open since 2019, Tierra is
                            one of the few fully certified organic eateries in Rome. The menu features
                            customizable poke bowls, organic breakfast, daily specials made with seasonal
                            produce, and an aperitivo hour (Aperitierra) with a beautiful outdoor terrace.
                            All ingredients are certified organic and sourced from local Lazio suppliers.
                            Open every day.
                        </p>
                    </article>
                </div>

                {/* Hidden-but-indexable SEO paragraph for keyword coverage */}
                <p className="max-w-screen-xl mx-auto px-6 lg:px-12 mt-12 text-[11px] text-tierra-muted leading-relaxed">
                    <strong>Tierra Organic Bistrot Roma</strong> — Ristorante biologico certificato nel
                    quartiere Parioli-Trieste di Roma. Via Tirso 34, 00198 Roma. Ideale per pranzo sano
                    a Roma nord, colazione biologica Roma, poke bowl Roma Parioli. Frequentato da
                    lavoratori degli uffici della zona Trieste-Salario, expat internazionali, turisti
                    in cerca di cibo sano a Roma, e appassionati di alimentazione biologica. Opzioni
                    vegetariane, vegane e senza glutine disponibili ogni giorno. Prenotazione consigliata
                    per il dehor. Aperitivo Aperitierra dalle 18:00 alle 20:00. Tag: ristorante bio Roma,
                    organic restaurant Rome Italy, healthy lunch Rome Parioli, bistrot biologico Roma
                    centro nord, poke bowl personalizzabile Roma, avocado toast Roma Parioli.
                </p>
            </section>
        </div>
    );
};

export default Landing;
