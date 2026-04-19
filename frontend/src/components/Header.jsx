import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, MessageCircle, Instagram } from "lucide-react";
import { useCart } from "../context/CartContext";
import { BRAND, waLink } from "../config/brand";

const Header = () => {
    const { count, setOpen } = useCart();
    const { pathname } = useLocation();

    const linkClass = (p) =>
        `text-sm tracking-wide transition-colors ${pathname === p ? "text-[#8A5B3D]" : "text-[#2C2418] hover:text-[#8A5B3D]"}`;

    return (
        <header
            data-testid="site-header"
            className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#F5EFE2]/90 border-b border-[#8A5B3D]/15"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
                <Link to="/" data-testid="logo-link" className="flex items-center gap-3">
                    <img src={BRAND.assets.logo} alt={BRAND.fullName} className="h-14 w-14 object-contain" />
                    <div className="hidden sm:flex flex-col leading-tight">
                        <span className="font-serif text-xl text-[#7C9A4A] tracking-wide">{BRAND.name}</span>
                        <span className="text-[9px] tracking-[0.28em] uppercase text-[#8A5B3D]">{BRAND.shortDescriptor}</span>
                    </div>
                </Link>

                <nav className="hidden md:flex items-center gap-8">
                    <Link data-testid="nav-menu" to="/menu" className={linkClass("/menu")}>Menù</Link>
                    <Link data-testid="nav-reservations" to="/prenota" className={linkClass("/prenota")}>Prenota</Link>
                    <Link data-testid="nav-about" to="/#storia" className="text-sm tracking-wide text-[#2C2418] hover:text-[#8A5B3D] transition-colors">Storia</Link>
                    <Link data-testid="nav-contact" to="/#contatti" className="text-sm tracking-wide text-[#2C2418] hover:text-[#8A5B3D] transition-colors">Contatti</Link>
                </nav>

                <div className="flex items-center gap-2">
                    {BRAND.links.instagram && (
                        <a
                            data-testid="instagram-header-btn"
                            href={BRAND.links.instagram}
                            target="_blank" rel="noreferrer"
                            aria-label="Instagram"
                            className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full text-[#8A5B3D] hover:text-[#7C9A4A] hover:bg-[#EADFC9]/60 transition-colors"
                        >
                            <Instagram size={18} strokeWidth={1.6} />
                        </a>
                    )}
                    <a
                        data-testid="whatsapp-header-btn"
                        href={waLink()}
                        target="_blank" rel="noreferrer"
                        className="hidden sm:inline-flex items-center gap-2 text-sm text-[#7C9A4A] hover:text-[#8A5B3D] transition-colors"
                    >
                        <MessageCircle size={18} strokeWidth={1.6} />
                        <span className="hidden lg:inline">WhatsApp</span>
                    </a>
                    <button
                        data-testid="open-cart-btn"
                        onClick={() => setOpen(true)}
                        className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C9A4A] text-[#FFFDF7] hover:bg-[#5E7F32] transition-colors"
                    >
                        <ShoppingBag size={18} strokeWidth={1.6} />
                        <span className="text-sm font-medium">Carrello</span>
                        {count > 0 && (
                            <span data-testid="cart-count-badge" className="ml-1 bg-[#8A5B3D] text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                                {count}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
