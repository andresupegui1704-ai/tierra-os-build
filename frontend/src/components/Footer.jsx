import React from "react";
import { MapPin, Phone, Mail, Instagram, MessageCircle } from "lucide-react";

const Footer = () => (
    <footer id="contatti" data-testid="site-footer" className="mt-24 bg-[#1C231A] text-[#F9F6F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
                <p className="overline text-[#C46D46]">Dove trovarci</p>
                <h3 className="font-serif italic text-4xl mt-4">Tierra <span className="not-italic">Organic Bistro</span></h3>
                <p className="mt-6 text-[#F1EBE1]/80 max-w-md leading-relaxed">
                    Un bistrot biologico nel cuore di Roma. Ingredienti di stagione, ricette d'autore,
                    un'esperienza che celebra la terra.
                </p>
            </div>

            <div>
                <p className="overline text-[#C46D46]">Contatti</p>
                <ul className="mt-4 space-y-3 text-sm">
                    <li className="flex items-start gap-3"><MapPin size={16} strokeWidth={1.5} className="mt-0.5" /><span>Via Tirso 34, Roma</span></li>
                    <li className="flex items-start gap-3"><Phone size={16} strokeWidth={1.5} className="mt-0.5" /><a href="tel:+393479915420" className="hover:text-[#C46D46]">+39 347 991 5420</a></li>
                    <li className="flex items-start gap-3"><Mail size={16} strokeWidth={1.5} className="mt-0.5" /><a href="mailto:tierraorganicbistrot@gmail.com" className="hover:text-[#C46D46] break-all">tierraorganicbistrot@gmail.com</a></li>
                    <li className="flex items-start gap-3"><MessageCircle size={16} strokeWidth={1.5} className="mt-0.5" /><a href="https://wa.me/393479915420" target="_blank" rel="noreferrer" className="hover:text-[#C46D46]">WhatsApp</a></li>
                </ul>
            </div>

            <div>
                <p className="overline text-[#C46D46]">Orari</p>
                <ul className="mt-4 space-y-2 text-sm text-[#F1EBE1]/85">
                    <li>Lun – Ven · 08:00 – 23:00</li>
                    <li>Sab – Dom · 09:00 – 23:30</li>
                    <li className="pt-2 overline text-[#C46D46]">Aperitierra</li>
                    <li>Tutti i giorni · 18:00 – 20:00</li>
                </ul>
                <a
                    data-testid="admin-login-link"
                    href="/admin"
                    className="inline-block mt-8 text-xs text-[#8A9486] hover:text-[#C46D46] tracking-widest uppercase"
                >
                    Accesso gestore
                </a>
            </div>
        </div>
        <div className="border-t border-white/10 py-6 text-center text-xs text-[#8A9486]">
            © {new Date().getFullYear()} Tierra Organic Bistro · Tutti i diritti riservati
        </div>
    </footer>
);

export default Footer;
