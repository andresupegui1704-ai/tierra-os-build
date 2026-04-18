import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, MessageCircle } from "lucide-react";
import { useCart } from "../context/CartContext";

const WHATSAPP = "+393479915420";

const Header = () => {
    const { count, setOpen } = useCart();
    const { pathname } = useLocation();

    const linkClass = (p) =>
        `text-sm tracking-wide transition-colors ${pathname === p ? "text-[#C46D46]" : "text-[#1C231A] hover:text-[#C46D46]"}`;

    return (
        <header
            data-testid="site-header"
            className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#F9F6F0]/85 border-b border-[#2B4A33]/10"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
                <Link to="/" data-testid="logo-link" className="flex items-baseline gap-2">
                    <span className="font-serif italic text-2xl text-[#1C231A] leading-none">Tierra</span>
                    <span className="overline hidden sm:block">Organic Bistro</span>
                </Link>

                <nav className="hidden md:flex items-center gap-8">
                    <Link data-testid="nav-menu" to="/menu" className={linkClass("/menu")}>Menù</Link>
                    <Link data-testid="nav-reservations" to="/prenota" className={linkClass("/prenota")}>Prenota</Link>
                    <Link data-testid="nav-about" to="/#storia" className="text-sm tracking-wide text-[#1C231A] hover:text-[#C46D46] transition-colors">Storia</Link>
                    <Link data-testid="nav-contact" to="/#contatti" className="text-sm tracking-wide text-[#1C231A] hover:text-[#C46D46] transition-colors">Contatti</Link>
                </nav>

                <div className="flex items-center gap-2">
                    <a
                        data-testid="whatsapp-header-btn"
                        href={`https://wa.me/${WHATSAPP.replace("+", "")}`}
                        target="_blank" rel="noreferrer"
                        className="hidden sm:inline-flex items-center gap-2 text-sm text-[#2B4A33] hover:text-[#C46D46] transition-colors"
                        title="Scrivici su WhatsApp"
                    >
                        <MessageCircle size={18} strokeWidth={1.6} />
                        <span className="hidden lg:inline">WhatsApp</span>
                    </a>
                    <button
                        data-testid="open-cart-btn"
                        onClick={() => setOpen(true)}
                        className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2B4A33] text-[#F9F6F0] hover:bg-[#223B28] transition-colors"
                    >
                        <ShoppingBag size={18} strokeWidth={1.6} />
                        <span className="text-sm font-medium">Carrello</span>
                        {count > 0 && (
                            <span data-testid="cart-count-badge" className="ml-1 bg-[#C46D46] text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
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
