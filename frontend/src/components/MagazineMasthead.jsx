import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BRAND } from "../config/brand";

/** MagazineMasthead — fixed editorial top header (Hoxton style).
 *  - Issue marker N° 01 + city/year on far left
 *  - Logo + brand name center
 *  - Reserve CTA right
 *  - Hover-italic on nav links
 */
const MagazineMasthead = () => {
    const [open, setOpen] = React.useState(false);
    const location = useLocation();
    const isHome = location.pathname === "/";

    const nav = [
        { to: "/menu", label: "Menù" },
        { to: "/prenota", label: "Prenota" },
        { to: "/contatti", label: "Contatti" },
    ];

    React.useEffect(() => setOpen(false), [location.pathname]);

    return (
        <>
            {/* TOP RULE — colophon bar */}
            <div className="hidden sm:block fixed top-0 inset-x-0 z-50 bg-tierra-bg/95 backdrop-blur-md border-b border-tierra-ink/10">
                <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 h-7 flex items-center justify-between text-[10px] tracking-[0.22em] uppercase text-tierra-ink2 font-sans">
                    <span data-testid="masthead-issue" className="flex items-center gap-3">
                        <span className="italic font-serif tracking-normal normal-case text-tierra-brand">N° 01</span>
                        <span className="opacity-70">·</span>
                        <span>Organic Bistrot</span>
                        <span className="opacity-70">·</span>
                        <span>Roma · MMXXVI</span>
                    </span>
                    <span className="hidden md:flex items-center gap-4 opacity-80">
                        <span>Via Tirso 34</span>
                        <span className="opacity-40">·</span>
                        <a href={`tel:${BRAND.phone.tel}`} className="link-italic">{BRAND.phone.display}</a>
                    </span>
                </div>
            </div>

            {/* MAIN MASTHEAD */}
            <header
                data-testid="magazine-masthead"
                className="fixed sm:top-7 top-0 inset-x-0 z-40 bg-tierra-bg/85 backdrop-blur-xl border-b border-tierra-ink/10"
            >
                <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
                    {/* Left — wordmark */}
                    <Link to="/" data-testid="masthead-logo" className="group flex items-center gap-3">
                        <img src="/brand/tierra-logo.png" alt="Tierra" className="h-9 w-9 object-contain" />
                        <span className="font-display text-2xl tracking-tight text-tierra-ink group-hover:italic transition-all">
                            Tierra
                        </span>
                    </Link>

                    {/* Center nav — desktop */}
                    <nav className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
                        {nav.map((n) => (
                            <Link
                                key={n.to}
                                to={n.to}
                                data-testid={`masthead-nav-${n.label.toLowerCase()}`}
                                className={`link-italic text-sm tracking-wide font-sans ${
                                    location.pathname === n.to ? "italic font-serif text-tierra-brand" : "text-tierra-ink"
                                }`}
                            >
                                {n.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Right CTA */}
                    <div className="flex items-center gap-2">
                        <Link
                            to="/prenota"
                            data-testid="masthead-reserve-cta"
                            className="hidden md:inline-flex items-center px-5 py-2 border border-tierra-ink text-tierra-ink hover:bg-tierra-ink hover:text-tierra-bg transition-colors text-sm tracking-wide font-sans"
                        >
                            Prenota
                        </Link>
                        <button
                            onClick={() => setOpen(!open)}
                            data-testid="masthead-menu-toggle"
                            className="md:hidden p-2 text-tierra-ink"
                            aria-label="menu"
                        >
                            {open ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* MOBILE NAV */}
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="md:hidden overflow-hidden bg-tierra-bg border-t border-tierra-ink/10"
                        >
                            <nav className="flex flex-col p-6 gap-4">
                                {nav.map((n) => (
                                    <Link
                                        key={n.to}
                                        to={n.to}
                                        className="font-display text-3xl text-tierra-ink hover:italic hover:text-tierra-brand transition-all"
                                    >
                                        {n.label}
                                    </Link>
                                ))}
                            </nav>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Spacer */}
            <div className="h-16 sm:h-[5.75rem]" />
        </>
    );
};

export default MagazineMasthead;
