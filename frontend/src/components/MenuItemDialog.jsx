import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { api } from "../lib/api";
import ImageUploader from "./ImageUploader";

const defaultItem = {
    name: "", description: "", price: "", category_slug: "", image_url: "", badge: "", available: true, order: 0,
};

const MenuItemDialog = ({ open, onOpenChange, categories, item, onSaved }) => {
    const [form, setForm] = useState(defaultItem);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            if (item) {
                setForm({
                    name: item.name || "", description: item.description || "",
                    price: String(item.price ?? ""), category_slug: item.category_slug || "",
                    image_url: item.image_url || "", badge: item.badge || "",
                    available: item.available !== false, order: item.order ?? 0,
                });
            } else {
                setForm({ ...defaultItem, category_slug: categories[0]?.slug || "" });
            }
        }
    }, [open, item, categories]);

    const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target?.value ?? e }));

    const save = async () => {
        if (!form.name.trim()) return toast.error("Nome obbligatorio");
        if (!form.category_slug) return toast.error("Seleziona una categoria");
        const price = parseFloat(form.price);
        if (isNaN(price) || price < 0) return toast.error("Prezzo non valido");
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description.trim() || null,
                price,
                category_slug: form.category_slug,
                image_url: form.image_url || null,
                badge: form.badge.trim() || null,
                available: !!form.available,
                order: parseInt(form.order || 0, 10),
            };
            if (item?.id) {
                await api.patch(`/admin/menu/items/${item.id}`, payload);
                toast.success("Piatto aggiornato");
            } else {
                await api.post("/admin/menu/items", payload);
                toast.success("Piatto aggiunto");
            }
            onSaved?.();
            onOpenChange(false);
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Errore salvataggio");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent data-testid="menu-item-dialog" className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-serif text-2xl">{item ? "Modifica piatto" : "Nuovo piatto"}</DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    <div>
                        <label className="overline block mb-2">Foto del piatto</label>
                        <ImageUploader value={form.image_url || null} onChange={(url) => setForm((f) => ({ ...f, image_url: url || "" }))} testid="item-image-uploader" />
                    </div>

                    <div>
                        <label className="overline block mb-2">Nome</label>
                        <input data-testid="item-form-name" value={form.name} onChange={update("name")} className="w-full rounded-xl bg-[#F5EFE2] px-4 py-3 outline-none focus:ring-1 focus:ring-[#7C9A4A]" />
                    </div>

                    <div>
                        <label className="overline block mb-2">Descrizione</label>
                        <textarea data-testid="item-form-desc" value={form.description} onChange={update("description")} rows={3} className="w-full rounded-xl bg-[#F5EFE2] px-4 py-3 outline-none focus:ring-1 focus:ring-[#7C9A4A]" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="overline block mb-2">Prezzo €</label>
                            <input data-testid="item-form-price" type="number" step="0.10" min="0" value={form.price} onChange={update("price")} className="w-full rounded-xl bg-[#F5EFE2] px-4 py-3 outline-none focus:ring-1 focus:ring-[#7C9A4A]" />
                        </div>
                        <div>
                            <label className="overline block mb-2">Categoria</label>
                            <Select value={form.category_slug} onValueChange={(v) => setForm((f) => ({ ...f, category_slug: v }))}>
                                <SelectTrigger data-testid="item-form-category" className="bg-[#F5EFE2] border-transparent py-6 rounded-xl"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="overline block mb-2">Ordine</label>
                            <input data-testid="item-form-order" type="number" value={form.order} onChange={update("order")} className="w-full rounded-xl bg-[#F5EFE2] px-4 py-3 outline-none focus:ring-1 focus:ring-[#7C9A4A]" />
                        </div>
                    </div>

                    <div>
                        <label className="overline block mb-2">Badge (opzionale)</label>
                        <input data-testid="item-form-badge" placeholder="es. Piatto del giorno" value={form.badge} onChange={update("badge")} className="w-full rounded-xl bg-[#F5EFE2] px-4 py-3 outline-none focus:ring-1 focus:ring-[#7C9A4A]" />
                    </div>

                    <label className="flex items-center gap-3 text-sm cursor-pointer">
                        <input data-testid="item-form-available" type="checkbox" checked={form.available} onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))} className="w-4 h-4 accent-[#7C9A4A]" />
                        <span>Disponibile per gli ordini</span>
                    </label>
                </div>

                <DialogFooter>
                    <button type="button" onClick={() => onOpenChange(false)} className="btn-outline-brand">Annulla</button>
                    <button type="button" data-testid="item-form-save" disabled={saving} onClick={save} className="btn-brand disabled:opacity-60">{saving ? "Salvataggio..." : "Salva"}</button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MenuItemDialog;
