import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Dialog for customizing a menu item (bowls, secondo).
 * Calls onConfirm({selections, unitPrice}) where selections is
 * [{group_name, option_names: [...], price_delta}]
 */
const CustomizationDialog = ({ open, onOpenChange, item, onConfirm }) => {
    const groups = item?.customization_groups || [];
    const [picks, setPicks] = useState({}); // {group_name: [option_name, ...]}

    useEffect(() => {
        if (open && item) {
            const initial = {};
            for (const g of groups) {
                if (g.selection_type === "single" && g.required && g.options.length > 0) {
                    initial[g.name] = [g.options[0].name];
                } else {
                    initial[g.name] = [];
                }
            }
            setPicks(initial);
        }
    }, [open, item]);

    const toggle = (group, optionName) => {
        setPicks((prev) => {
            const current = prev[group.name] || [];
            if (group.selection_type === "single") {
                return { ...prev, [group.name]: [optionName] };
            }
            if (current.includes(optionName)) {
                return { ...prev, [group.name]: current.filter((n) => n !== optionName) };
            }
            if (current.length >= (group.max_select || 99)) {
                toast.error(`Massimo ${group.max_select} opzioni per ${group.name}`);
                return prev;
            }
            return { ...prev, [group.name]: [...current, optionName] };
        });
    };

    const deltaTotal = useMemo(() => {
        let d = 0;
        for (const g of groups) {
            const chosen = picks[g.name] || [];
            for (const opt of g.options) if (chosen.includes(opt.name)) d += Number(opt.price_delta || 0);
        }
        return d;
    }, [groups, picks]);

    const unitPrice = (item?.price || 0) + deltaTotal;

    const confirm = () => {
        // Validate min_select
        for (const g of groups) {
            const chosen = picks[g.name] || [];
            if (g.required && chosen.length < (g.min_select || 1)) {
                return toast.error(`Seleziona almeno ${g.min_select} opzione(i) per ${g.name}`);
            }
            if (chosen.length > (g.max_select || 1)) {
                return toast.error(`Massimo ${g.max_select} opzioni per ${g.name}`);
            }
        }
        const selections = groups
            .map((g) => {
                const option_names = picks[g.name] || [];
                if (option_names.length === 0) return null;
                const delta = g.options
                    .filter((o) => option_names.includes(o.name))
                    .reduce((s, o) => s + Number(o.price_delta || 0), 0);
                return { group_name: g.name, option_names, price_delta: Number(delta.toFixed(2)) };
            })
            .filter(Boolean);
        onConfirm({ selections, unitPrice });
        onOpenChange(false);
    };

    if (!item) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent data-testid="customization-dialog" className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <p className="overline">Personalizza</p>
                    <DialogTitle className="font-serif text-3xl">{item.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {groups.map((g) => {
                        const chosen = picks[g.name] || [];
                        return (
                            <section key={g.name} data-testid={`group-${g.name}`}>
                                <div className="flex items-baseline justify-between">
                                    <h3 className="font-serif text-xl text-[#2C2418]">{g.name}</h3>
                                    <span className="text-[11px] text-[#9B8E7A] uppercase tracking-widest">
                                        {g.required ? "obbligatorio" : "opzionale"}
                                        {g.max_select > 1 ? ` · max ${g.max_select}` : ""}
                                    </span>
                                </div>
                                {g.description && <p className="text-sm text-[#5C4E3C] mt-1">{g.description}</p>}
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {g.options.map((o) => {
                                        const selected = chosen.includes(o.name);
                                        return (
                                            <button
                                                type="button"
                                                key={o.name}
                                                data-testid={`option-${o.name}`}
                                                onClick={() => toggle(g, o.name)}
                                                className={`text-left p-3 rounded-xl border transition-all ${
                                                    selected
                                                        ? "border-[#7C9A4A] bg-[#7C9A4A]/10"
                                                        : "border-[#8A5B3D]/15 bg-white hover:border-[#8A5B3D]/40"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            {selected && <Check size={14} className="text-[#5E7F32]" />}
                                                            <span className="font-medium text-sm text-[#2C2418]">{o.name}</span>
                                                        </div>
                                                        {o.description && <p className="text-[11px] text-[#5C4E3C] mt-1">{o.description}</p>}
                                                    </div>
                                                    {o.price_delta > 0 && (
                                                        <span className="text-xs text-[#8A5B3D] font-medium shrink-0">+ € {Number(o.price_delta).toFixed(2)}</span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[#8A5B3D]/15">
                    <div>
                        <p className="text-xs text-[#9B8E7A]">Prezzo base € {item.price.toFixed(2)}</p>
                        <p className="font-serif text-2xl text-[#7C9A4A]" data-testid="customization-total">€ {unitPrice.toFixed(2)}</p>
                    </div>
                    <button data-testid="customization-confirm" onClick={confirm} className="btn-brand">
                        Aggiungi all'ordine
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CustomizationDialog;
