import React from "react";
import { Plus, XCircle } from "lucide-react";
import { useCart } from "../context/CartContext";

const MenuCard = ({ item }) => {
    const { addItem } = useCart();
    const unavailable = !item.available;

    return (
        <article
            data-testid={`menu-card-${item.id}`}
            className={`group relative flex flex-col rounded-2xl overflow-hidden bg-[#F1EBE1] border border-transparent hover:border-[#2B4A33]/20 shadow-sm hover:shadow-md transition-all duration-300 ${unavailable ? "opacity-60" : ""}`}
        >
            {item.image_url ? (
                <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                        src={item.image_url}
                        alt={item.name}
                        loading="lazy"
                        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${unavailable ? "grayscale" : ""}`}
                    />
                    {item.badge && (
                        <span className="absolute top-3 left-3 bg-[#1C231A] text-[#F9F6F0] text-[10px] font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full">
                            {item.badge}
                        </span>
                    )}
                    {unavailable && (
                        <div className="absolute inset-0 bg-[#1C231A]/40 flex items-center justify-center">
                            <span className="bg-white text-[#963A3A] text-xs font-semibold tracking-wider uppercase px-4 py-2 rounded-full inline-flex items-center gap-2">
                                <XCircle size={14} /> Esaurito
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="aspect-[4/3] bg-[#E8E0D0] flex items-center justify-center">
                    <span className="font-serif italic text-5xl text-[#C46D46]/50">Tierra</span>
                </div>
            )}

            <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-4">
                    <h3 className="font-serif text-2xl leading-tight text-[#1C231A]" data-testid={`item-name-${item.id}`}>{item.name}</h3>
                    <span className="font-serif text-xl text-[#2B4A33] shrink-0" data-testid={`item-price-${item.id}`}>€ {item.price.toFixed(2)}</span>
                </div>
                {item.description && (
                    <p className="mt-3 text-sm text-[#515E4C] leading-relaxed flex-1">{item.description}</p>
                )}
                <button
                    data-testid={`add-to-cart-${item.id}`}
                    disabled={unavailable}
                    onClick={() => addItem(item)}
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-[#2B4A33]/10 text-[#2B4A33] hover:bg-[#2B4A33] hover:text-[#F9F6F0] disabled:opacity-40 disabled:cursor-not-allowed rounded-full py-2.5 text-sm font-medium transition-colors"
                >
                    <Plus size={16} strokeWidth={2} />
                    {unavailable ? "Non disponibile" : "Aggiungi all'ordine"}
                </button>
            </div>
        </article>
    );
};

export default MenuCard;
