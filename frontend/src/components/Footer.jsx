import React from "react";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";

const LOGO = "/brand/tierra-logo.png";

const Footer = () => (
    <footer id="contatti" data-testid="site-footer" className="mt-24 bg-[#2C2418] text-[#F5EFE2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
                <img src={LOGO} alt="Tierra Organic Bistrot Café" className="h-24 w-auto object-contain" style={{ filter: "brightness(0) invert(1) sepia(0.3) saturate(2) hue-rotate(40deg)" }} />
                <p className="mt-6 text-[#EADFC9]/85 max-w-md leading-relaxed">
                    Un bistrot biologico nel cuore di Roma. Ingredienti di stagione, ricette d'autore,
                    un'esperienza che celebra il gusto autentico.
                </p>
            </div>

            <div>
                <p className="overline text-[#A5B276]">Contatti</p>
                <ul className="mt-4 space-y-3 text-sm">
                    <li className="flex items-start gap-3"><MapPin size={16} strokeWidth={1.5} className="mt-0.5" /><span>Via Tirso 34, Roma</span></li>
                    <li className="flex items-start gap-3"><Phone size={16} strokeWidth={1.5} className="mt-0.5" /><a href="tel:+393479915420" className="hover:text-[#A5B276]">+39 347 991 5420</a></li>
                    <li className="flex items-start gap-3"><Mail size={16} strokeWidth={1.5} className="mt-0.5" /><a href="mailto:tierraorganicbistrot@gmail.com" className="hover:text-[#A5B276] break-all">tierraorganicbistrot@gmail.com</a></li>
                    <li className="flex items-start gap-3"><MessageCircle size={16} strokeWidth={1.5} className="mt-0.5" /><a href="https://wa.me/393479915420" target="_blank" rel="noreferrer" className="hover:text-[#A5B276]">WhatsApp</a></li>
                </ul>
            </div>

            <div>
                <p className="overline text-[#A5B276]">Orari</p>
                <ul className="mt-4 space-y-2 text-sm text-[#EADFC9]/85">
                    <li>Lun – Ven · 08:00 – 23:00</li>
                    <li>Sab – Dom · 09:00 – 23:30</li>
                    <li className="pt-2 overline text-[#A5B276]">Aperitierra</li>
                    <li>Tutti i giorni · 18:00 – 20:00</li>
                </ul>
                <a
                    data-testid="admin-login-link"
                    href="/admin"
                    className="inline-block mt-8 text-xs text-[#9B8E7A] hover:text-[#A5B276] tracking-widest uppercase"
                >
                    Accesso gestore
                </a>
            </div>
        </div>
        <div className="border-t border-white/10 py-6 text-center text-xs text-[#9B8E7A]">
            © {new Date().getFullYear()} Tierra Organic Bistrot · Cafè — Via Tirso 34, Roma
        </div>
    </footer>
);

export default Footer;
