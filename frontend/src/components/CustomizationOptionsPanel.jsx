import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Switch } from "./ui/switch";
import { api } from "../lib/api";
import { toast } from "sonner";

/**
 * Accordion panel per gestire le opzioni di personalizzazione (proteine, extra, basi)
 * di un item. Ogni opzione ha uno switch per accendere/spegnere la disponibilità.
 */
const CustomizationOptionsPanel = ({ item, onUpdated }) => {
    const [open, setOpen] = useState(false);
    const groups = item.customization_groups || [];
    if (groups.length === 0) return null;

    const toggleOption = async (groupName, optionName) => {
        try {
            const { data } = await api.post(
                `/admin/menu/items/${item.id}/option-toggle`,
                null,
                { params: { group_name: groupName, option_name: optionName } }
            );
            onUpdated({
                ...item,
                customization_groups: groups.map((g) => g.name !== groupName ? g : {
                    ...g,
                    options: g.options.map((o) => o.name === optionName ? { ...o, available: data.available } : o),
                }),
            });
            toast.success(data.available ? `${optionName}: disponibile` : `${optionName}: esaurito`);
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Errore");
        }
    };

    const totalOpts = groups.reduce((s, g) => s + g.options.length, 0);
    const offOpts = groups.reduce((s, g) => s + g.options.filter((o) => o.available === false).length, 0);

    return (
        <div className="border-t border-[#8A5B3D]/10">
            <button
                type="button"
                data-testid={`expand-options-${item.id}`}
                onClick={() => setOpen(!open)}
                className={`w-full flex items-center justify-between px-5 py-3 text-left text-xs uppercase tracking-widest transition-colors ${open ? "bg-[#F5EFE2]" : "hover:bg-[#F5EFE2]/50"}`}
            >
                <span className="text-[#5C4E3C]">
                    Gestisci opzioni ({totalOpts})
                    {offOpts > 0 && <span className="ml-2 text-[#923F28] normal-case">· {offOpts} spenti</span>}
                </span>
                <ChevronDown size={14} className={`transition-transform text-[#8A5B3D] ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="px-5 pb-5 bg-[#F5EFE2]/40 space-y-5">
                    {groups.map((g) => (
                        <div key={g.name}>
                            <h5 className="font-medium text-sm text-[#2C2418] mb-2">{g.name}</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {g.options.map((o) => {
                                    const on = o.available !== false;
                                    return (
                                        <div key={o.name} data-testid={`option-row-${item.id}-${o.name}`} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-[#8A5B3D]/10">
                                            <div className="min-w-0">
                                                <p className={`text-sm ${on ? "text-[#2C2418]" : "text-[#9B8E7A] line-through"}`}>{o.name}</p>
                                                {o.price_delta > 0 && <p className="text-[11px] text-[#8A5B3D]">+€ {Number(o.price_delta).toFixed(2)}</p>}
                                            </div>
                                            <Switch
                                                data-testid={`option-toggle-${o.name}`}
                                                checked={on}
                                                onCheckedChange={() => toggleOption(g.name, o.name)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomizationOptionsPanel;
