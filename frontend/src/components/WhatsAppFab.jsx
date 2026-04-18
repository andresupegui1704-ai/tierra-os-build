import React from "react";
import { MessageCircle } from "lucide-react";

const WHATSAPP = "393479915420";

const WhatsAppFab = () => (
    <a
        data-testid="whatsapp-fab"
        href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Ciao Tierra! Vorrei qualche info 🌿")}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-5 py-4 rounded-full bg-[#25D366] text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
        aria-label="Chatta su WhatsApp"
    >
        <MessageCircle size={22} strokeWidth={1.8} />
        <span className="font-medium text-sm hidden sm:inline">Chatta con noi</span>
    </a>
);

export default WhatsAppFab;
