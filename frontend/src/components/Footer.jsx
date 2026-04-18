import React from "react";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { BRAND, waLink, telLink, mailtoLink } from "../config/brand";

const Footer = () => (
    <footer id="contatti" data-testid="site-footer" className="mt-24 bg-[#2C2418] text-[#F5EFE2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
                <img src={BRAND.assets.logo} alt={BRAND.fullName} className="h-24 w-auto object-contain" style={{ filter: "brightness(0) invert(1) sepia(0.3) saturate(2) hue-rotate(40deg)" }} />
                <p className="mt-6 text-[#EADFC9]/85 max-w-md leading-relaxed">
                    {BRAND.copy.footerDescription}
                </p>
            </div>

            <div>
                <p className="overline text-[#A5B276]">Contatti</p>
                <ul className="mt-4 space-y-3 text-sm">
                    <li className="flex items-start gap-3"><MapPin size={16} strokeWidth={1.5} className="mt-0.5" /><span>{BRAND.address.full}</span></li>
                    <li className="flex items-start gap-3"><Phone size={16} strokeWidth={1.5} className="mt-0.5" /><a href={telLink()} className="hover:text-[#A5B276]">{BRAND.phone.display}</a></li>
                    <li className="flex items-start gap-3"><Mail size={16} strokeWidth={1.5} className="mt-0.5" /><a href={mailtoLink()} className="hover:text-[#A5B276] break-all">{BRAND.email}</a></li>
                    <li className="flex items-start gap-3"><MessageCircle size={16} strokeWidth={1.5} className="mt-0.5" /><a href={waLink()} target="_blank" rel="noreferrer" className="hover:text-[#A5B276]">WhatsApp</a></li>
                </ul>
            </div>

            <div>
                <p className="overline text-[#A5B276]">Orari</p>
                <ul className="mt-4 space-y-2 text-sm text-[#EADFC9]/85">
                    {BRAND.hours.map((h) => (
                        <li key={h.days}>{h.days} · {h.time}</li>
                    ))}
                    {BRAND.specialHours && (
                        <>
                            <li className="pt-2 overline text-[#A5B276]">{BRAND.specialHours.label}</li>
                            <li>{BRAND.specialHours.time}</li>
                        </>
                    )}
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
            © {new Date().getFullYear()} {BRAND.fullName} — {BRAND.address.full}
        </div>
    </footer>
);

export default Footer;
