import React, { useState } from "react";
import { Plus, Sliders } from "lucide-react";
import { useCart } from "../context/CartContext";
import CustomizationDialog from "./CustomizationDialog";

const ALLERGEN_LABEL = {
    G: "Glutine", L: "Lattosio", E: "Uova", N: "Frutta a guscio", F: "Pesce", S: "Solfiti",
};

/** Editorial menu row — Soho / Hoxton-style.
 *  Title + dotted leader + price; description on a second line; allergens as small caps tags. */
const MenuRow = ({ item }) => {
    const { addItem } = useCart();
    const unavailable = !item.available;
    const hasOptions = (item.customization_groups || []).length > 0;
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleAdd = () => {
        if (unavailable) return;
        if (hasOptions) setDialogOpen(true);
        else addItem(item);
    };

    return (
        <>
            <button
                onClick={handleAdd}
                disabled={unavailable}
                data-testid={`menu-row-${item.id}`}
                className={`group w-full text-left py-7 border-b border-[#8A5B3D]/15 transition-colors ${
                    unavailable ? "opacity-50 cursor-not-allowed" : "hover:bg-[#EADFC9]/25 cursor-pointer"
                }`}
            >
                <div className="px-1 sm:px-2">
                    {/* Title row: name · dotted leader · price */}
                    <div className="flex items-baseline gap-3">
                        <h3 className="font-serif text-xl sm:text-2xl text-[#2C2418] flex-shrink-0">
                            {item.name}
                            {item.badge && (
                                <span className="ml-3 text-[10px] tracking-[0.2em] uppercase font-sans align-middle text-[#7C9A4A]">
                                    · {item.badge}
                                </span>
                            )}
                        </h3>
                        <span className="flex-1 border-b border-dotted border-[#8A5B3D]/30 mb-1.5" />
                        <span className="font-serif italic text-xl sm:text-2xl text-[#8A5B3D] flex-shrink-0 tabular-nums">
                            € {Number(item.price).toFixed(2)}
                        </span>
                    </div>

                    {/* Description */}
                    {item.description && (
                        <p className="mt-2 text-sm sm:text-[15px] text-[#5C4E3C] leading-relaxed max-w-3xl">
                            {item.description}
                        </p>
                    )}

                    {/* Bottom meta line: allergens · personalizzabile · CTA */}
                    <div className="mt-3 flex items-center flex-wrap gap-x-4 gap-y-2">
                        {(item.tags || []).length > 0 && (
                            <div className="flex items-center gap-1.5">
                                {(item.tags || []).map((t) => (
                                    <span
                                        key={t}
                                        title={ALLERGEN_LABEL[t] || t}
                                        className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-semibold tracking-tight border border-[#8A5B3D]/35 text-[#8A5B3D]/80 rounded-full"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}

                        {hasOptions && !unavailable && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-[#7C9A4A]">
                                <Sliders size={11} strokeWidth={1.5} /> Personalizzabile
                            </span>
                        )}

                        {unavailable && (
                            <span className="text-[10px] tracking-[0.2em] uppercase text-[#923F28]">
                                Esaurito
                            </span>
                        )}

                        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-[#8A5B3D]/0 group-hover:text-[#8A5B3D] transition-colors">
                            <Plus size={14} strokeWidth={1.5} /> Aggiungi
                        </span>
                    </div>
                </div>
            </button>

            {hasOptions && (
                <CustomizationDialog
                    item={item}
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                />
            )}
        </>
    );
};

export default MenuRow;
