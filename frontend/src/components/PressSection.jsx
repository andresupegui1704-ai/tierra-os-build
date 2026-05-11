import React from "react";
import { motion } from "framer-motion";

/** PressSection — editorial "As seen in" block with Gambero Rosso as hero.
 *  Magazine-style typography, no fake logos — clean wordmarks.
 *  IT + EN copy for crawlers and human readers. */
const PRESS = [
    {
        name: "Gambero Rosso",
        href: "https://www.gamberorosso.it/luoghi/locali/bistrot/tierra-organic-bistrot/",
        note: "Guida Roma & Meglio del Lazio · 6 anni consecutivi",
        hero: true,
    },
    {
        name: "Turismo Roma",
        href: "https://www.turismoroma.it/en/hospitality/tierra-organic-bistrot",
        note: "Portale ufficiale Comune di Roma",
    },
    {
        name: "TheFork",
        href: "https://www.thefork.it/ristorante/tierra-organic-bistrot-r801635",
        note: "Valutazione 8.2 / 10",
    },
    {
        name: "TripAdvisor",
        href: "https://www.tripadvisor.com/Restaurant_Review-g187791-d19874458-Reviews-Tierra_Organic_Bistrot-Rome_Lazio.html",
        note: "Recensioni internazionali",
    },
    {
        name: "Eco in Città",
        href: "https://www.ecoincitta.it/ecopoint/tierra-organic-bistrot/",
        note: "Eco point Roma",
    },
    {
        name: "Wanderlog",
        href: "#",
        note: "Recommended on travel guides",
    },
];

const PressSection = () => {
    return (
        <section
            data-testid="press-section"
            aria-label="Press e riconoscimenti"
            className="bg-tierra-bg py-24 sm:py-32 border-t border-tierra-ink/10"
        >
            <div className="max-w-screen-xl mx-auto px-6 lg:px-12">
                {/* Section opener */}
                <div className="flex items-baseline gap-5 mb-12">
                    <span className="mag-number text-6xl sm:text-7xl">PR</span>
                    <span className="h-px w-20 bg-tierra-ink/30 mb-3" />
                    <span className="overline">Press &amp; riconoscimenti</span>
                </div>

                {/* Hero quote */}
                <motion.blockquote
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="h-display text-3xl sm:text-5xl text-tierra-ink leading-[1.1] max-w-4xl"
                >
                    Segnalato dalla guida<br/>
                    <span className="italic text-tierra-brand">Gambero Rosso</span> tra i migliori bistrot
                    di Roma e del Lazio per <span className="italic">sei anni consecutivi.</span>
                </motion.blockquote>

                {/* Press grid — Gambero Rosso hero (2 col) + 3 testate + banner GR (3 col) + 2 testate
                    Layout 5-col:
                      Row 1: [Gambero Rosso×2] [Turismo Roma] [TheFork] [TripAdvisor]
                      Row 2: [GR 6-year banner×3]              [Eco in Città] [Wanderlog]
                */}
                <div className="mt-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-tierra-ink/10 border border-tierra-ink/10">
                    {PRESS.map((p, i) => (
                        <motion.a
                            key={p.name}
                            href={p.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`press-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className={`group bg-tierra-bg p-8 sm:p-10 flex flex-col items-center justify-center text-center transition-colors hover:bg-tierra-bgAlt ${
                                p.hero ? "col-span-2 bg-tierra-bgDeep" : ""
                            } ${p.name === "Wanderlog" ? "order-6" : ""} ${p.name === "Eco in Città" ? "order-5" : ""}`}
                        >
                            <span className={`font-display tracking-tight text-tierra-ink ${p.hero ? "text-3xl sm:text-4xl" : "text-2xl"}`}>
                                {p.name}
                            </span>
                            <span className="overline text-[9px] mt-3 text-tierra-muted normal-case tracking-[0.18em]">
                                {p.note}
                            </span>
                        </motion.a>
                    ))}

                    {/* Banner Gambero Rosso 6 yearly editions — fills the empty 3-col gap on row 2 */}
                    <motion.a
                        href="https://www.gamberorosso.it/luoghi/locali/bistrot/tierra-organic-bistrot/"
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="press-gambero-banner"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        aria-label="Gambero Rosso — sei edizioni consecutive 2021-2026"
                        className="col-span-2 md:col-span-3 lg:col-span-3 order-4 bg-tierra-bg p-0 overflow-hidden group"
                    >
                        <img
                            src="/press/gambero-rosso-2021-2026.png"
                            alt="Tierra Organic Bistrot nella guida Gambero Rosso Roma e il Meglio del Lazio — edizioni 2021, 2022, 2023, 2024, 2025, 2026"
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                        />
                    </motion.a>
                </div>

                {/* SEO copy IT + EN */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-10 text-sm text-tierra-ink2 leading-relaxed">
                    <p>
                        <strong className="text-tierra-ink">Tierra nella stampa e nelle guide.</strong>{" "}
                        Tierra Organic Bistrot è segnalato nella{" "}
                        <em>Guida Gambero Rosso — Roma e il Meglio del Lazio</em>{" "}
                        da sei anni consecutivi come uno dei migliori bistrot della regione.
                        Il locale è stato recensito da Turismo Roma (portale ufficiale del
                        Comune di Roma), TheFork (valutazione 8.2/10), Eco in Città e citato
                        su Wanderlog e TripAdvisor da clienti di tutto il mondo.
                    </p>
                    <p lang="en">
                        <strong className="text-tierra-ink">As seen in.</strong>{" "}
                        Tierra Organic Bistrot has been featured in the{" "}
                        <em>Gambero Rosso Guide — Rome &amp; Best of Lazio</em>{" "}
                        for six consecutive years as one of the region&apos;s top bistros.
                        Also reviewed by Turismo Roma (the City of Rome official tourism
                        portal), TheFork (8.2/10), and recommended on international travel
                        platforms including Wanderlog and TripAdvisor by visitors from
                        around the world.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default PressSection;
