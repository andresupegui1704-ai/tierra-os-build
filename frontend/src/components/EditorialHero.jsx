import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BRAND, waLink } from "../config/brand";

/** EditorialHero — Hoxton-style asymmetric hero.
 *  Left 7 cols: massive H1 with italic accents + colophon bottom-left
 *  Right 5 cols: large watercolor/photo bleeding off-edge */
const EditorialHero = () => {
    return (
        <section className="relative bg-tierra-bg overflow-hidden">
            {/* Subtle paper grain */}
            <div className="absolute inset-0 paper-texture opacity-30 pointer-events-none" />

            <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 pt-16 sm:pt-24 pb-20 sm:pb-32 relative">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end">
                    {/* LEFT — Massive editorial title */}
                    <div className="lg:col-span-7 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="flex items-center gap-4 mb-8 sm:mb-12"
                        >
                            <span className="mag-number text-5xl sm:text-6xl">01</span>
                            <span className="h-px flex-1 max-w-32 bg-tierra-ink/30" />
                            <span className="overline">Aperti dal 2024</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="h-display text-tierra-ink"
                            style={{ fontSize: "clamp(3rem, 9vw, 9rem)" }}
                        >
                            Cucina<br/>
                            <span className="italic font-light text-tierra-brand">biologica</span><br/>
                            che sa di <span className="italic font-light">casa.</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="mt-10 sm:mt-14 max-w-lg text-base sm:text-lg text-tierra-ink2 leading-relaxed"
                        >
                            Un bistrot a due passi da Piazza Fiume, dove le materie prime sono
                            scelte ogni mattina e l'ospitalità si misura in dettagli.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.55 }}
                            className="mt-10 flex flex-wrap items-center gap-4 sm:gap-6"
                        >
                            <Link
                                to="/menu"
                                data-testid="hero-cta-menu"
                                className="group inline-flex items-center gap-3 px-7 py-4 bg-tierra-ink text-tierra-bg hover:bg-tierra-brand transition-colors font-sans text-sm tracking-wide"
                            >
                                Ordina online
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/prenota"
                                data-testid="hero-cta-reserve"
                                className="link-italic inline-flex items-center gap-2 text-tierra-ink underline underline-offset-8 decoration-tierra-brand/40 hover:decoration-tierra-brand font-sans text-sm"
                            >
                                Prenota un tavolo
                            </Link>
                        </motion.div>

                        {/* COLOPHON */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.7 }}
                            className="mt-16 sm:mt-24 pt-6 border-t border-tierra-ink/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] tracking-[0.18em] uppercase text-tierra-ink2"
                        >
                            <div>
                                <p className="opacity-60 mb-1">Indirizzo</p>
                                <a
                                    href={BRAND.links.mapsDirections}
                                    target="_blank" rel="noreferrer"
                                    className="link-italic text-tierra-ink normal-case tracking-normal text-sm"
                                >
                                    Via Tirso 34, Roma
                                </a>
                            </div>
                            <div>
                                <p className="opacity-60 mb-1">Orari</p>
                                <span className="text-tierra-ink normal-case tracking-normal text-sm">
                                    Tutti i giorni · 7 – 23
                                </span>
                            </div>
                            <div>
                                <p className="opacity-60 mb-1">Telefono</p>
                                <a href={`tel:${BRAND.phone.tel}`} className="link-italic text-tierra-ink normal-case tracking-normal text-sm">
                                    {BRAND.phone.display}
                                </a>
                            </div>
                            <div>
                                <p className="opacity-60 mb-1">WhatsApp</p>
                                <a href={waLink()} target="_blank" rel="noreferrer" className="link-italic text-tierra-ink normal-case tracking-normal text-sm">
                                    Scrivici
                                </a>
                            </div>
                        </motion.div>
                    </div>

                    {/* RIGHT — Hero image / watercolor cluster */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="lg:col-span-5 relative lg:translate-x-8"
                    >
                        <div className="relative aspect-[4/5] overflow-hidden">
                            <img
                                src="https://customer-assets.emergentagent.com/job_tierra-bistro-menu/artifacts/eud1nx8m_raulandres17_Catalana_salad_with_baked_potatoes_shrimps_octop_7b641cb4-a68f-4dc5-a1bd-cc89323a5f5b_2.png"
                                alt="Tierra Plate — la nostra firma"
                                className="absolute inset-0 w-full h-full object-cover float-y"
                            />
                            {/* Editorial tag in corner */}
                            <div className="absolute bottom-6 left-6 bg-tierra-paper px-4 py-3 max-w-[200px]">
                                <p className="overline text-tierra-brand">Piatto del giorno</p>
                                <p className="font-display italic text-xl text-tierra-ink mt-1 leading-tight">
                                    Tierra Plate
                                </p>
                            </div>
                        </div>

                        {/* Decorative N° marker */}
                        <span
                            aria-hidden
                            className="hidden lg:block absolute -top-12 -right-4 mag-number text-9xl opacity-15 select-none"
                        >
                            01
                        </span>
                    </motion.div>
                </div>
            </div>

            {/* Hand-drawn wave divider */}
            <div aria-hidden className="divider-wave" />
        </section>
    );
};

export default EditorialHero;
