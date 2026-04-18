import React, { useState } from "react";
import { Plus, XCircle, Sliders } from "lucide-react";
import { useCart } from "../context/CartContext";
import CustomizationDialog from "./CustomizationDialog";

const MenuCard = ({ item }) => {
    const { addItem } = useCart();
    const unavailable = !item.available;
    const hasOptions = (item.customization_groups || []).length > 0;
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleAdd = () => {
        if (hasOptions) {
            setDialogOpen(true);
        } else {
            addItem(item);
        }
    };

    return (
        <article
            data-testid={`menu-card-${item.id}`}
            className={`group relative flex flex-col rounded-2xl overflow-hidden bg-[#FFFDF7] border border-[#8A5B3D]/10 hover:border-[#8A5B3D]/35 shadow-sm hover:shadow-md transition-all duration-300 ${unavailable ? "opacity-60" : ""}`}
        >
            {item.image_url ? (
                <div className="relative aspect-square overflow-hidden">
                    <img
                        src={item.image_url}
                        alt={item.image_alt || item.name}
                        loading="lazy"
                        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${unavailable ? "grayscale" : ""}`}
                    />
                    {item.badge && (
                        <span className="absolute top-3 left-3 bg-[#2C2418] text-[#F5EFE2] text-[10px] font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full">
                            {item.badge}
                        </span>
                    )}
                    {hasOptions && !unavailable && (
                        <span className="absolute top-3 right-3 bg-[#7C9A4A] text-[#FFFDF7] text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <Sliders size={11} strokeWidth={2} /> Personalizzabile
                        </span>
                    )}
                    {unavailable && (
                        <div className="absolute inset-0 bg-[#2C2418]/45 flex items-center justify-center">
                            <span className="bg-[#FFFDF7] text-[#923F28] text-xs font-semibold tracking-wider uppercase px-4 py-2 rounded-full inline-flex items-center gap-2">
                                <XCircle size={14} /> Esaurito
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="aspect-square bg-[#EADFC9] flex items-center justify-center relative">
                    <span className="font-serif italic text-5xl text-[#8A5B3D]/40">Tierra</span>
                    {hasOptions && !unavailable && (
                        <span className="absolute top-3 right-3 bg-[#7C9A4A] text-[#FFFDF7] text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <Sliders size={11} strokeWidth={2} /> Personalizzabile
                        </span>
                    )}
                </div>
            )}

            <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-4">
                    <h3 className="font-serif text-2xl leading-tight text-[#2C2418]" data-testid={`item-name-${item.id}`}>{item.name}</h3>
                    <span className="font-serif text-xl text-[#7C9A4A] shrink-0" data-testid={`item-price-${item.id}`}>€ {item.price.toFixed(2)}</span>
                </div>
                {item.description && (
                    <p className="mt-3 text-sm text-[#5C4E3C] leading-relaxed flex-1">{item.description}</p>
                )}
                <button
                    data-testid={`add-to-cart-${item.id}`}
                    disabled={unavailable}
                    onClick={handleAdd}
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-[#7C9A4A]/12 text-[#4A6127] hover:bg-[#7C9A4A] hover:text-[#FFFDF7] disabled:opacity-40 disabled:cursor-not-allowed rounded-full py-2.5 text-sm font-medium transition-colors"
                >
                    <Plus size={16} strokeWidth={2} />
                    {unavailable ? "Non disponibile" : hasOptions ? "Scegli e aggiungi" : "Aggiungi all'ordine"}
                </button>
            </div>

            {hasOptions && (
                <CustomizationDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    item={item}
                    onConfirm={({ selections, unitPrice }) => addItem(item, { customizations: selections, unitPrice })}
                />
            )}
        </article>
    );
};

export default MenuCard;
