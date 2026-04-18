import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UtensilsCrossed, ShoppingBag, CalendarDays, LogOut, Edit2, Check, X, Plus, Trash2, Printer, Download, RefreshCw, Sparkles, BarChart3, Megaphone } from "lucide-react";
import { Switch } from "../components/ui/switch";
import { api } from "../lib/api";
import MenuItemDialog from "../components/MenuItemDialog";
import CustomizationOptionsPanel from "../components/CustomizationOptionsPanel";
import { StatsPanel, MarketingPanel } from "../components/admin/StatsAndMarketing";

const Sidebar = ({ active, onNav, onLogout }) => (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#2C2418] text-[#F5EFE2] p-6 hidden lg:flex flex-col">
        <div className="flex items-center gap-3">
            <img src="/brand/tierra-logo.png" alt="Tierra" className="h-14 w-14 object-contain" style={{ filter: "brightness(0) invert(1) sepia(0.3) saturate(2) hue-rotate(40deg)" }} />
            <div>
                <p className="overline text-[#A5B276]">Admin</p>
                <h1 className="font-serif text-2xl text-[#F5EFE2]">Tierra</h1>
            </div>
        </div>
        <nav className="mt-12 flex-1 space-y-1 text-sm">
            {[
                { id: "menu", icon: UtensilsCrossed, label: "Menù" },
                { id: "orders", icon: ShoppingBag, label: "Ordini" },
                { id: "reservations", icon: CalendarDays, label: "Prenotazioni" },
                { id: "stats", icon: BarChart3, label: "Statistiche" },
                { id: "marketing", icon: Megaphone, label: "Marketing" },
                { id: "printer", icon: Printer, label: "Stampante" },
            ].map((it) => (
                <button key={it.id} data-testid={`sidebar-${it.id}`} onClick={() => onNav(it.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active === it.id ? "bg-white/10 text-[#A5B276]" : "hover:bg-white/5"}`}>
                    <it.icon size={16} strokeWidth={1.5} />{it.label}
                </button>
            ))}
        </nav>
        <button data-testid="admin-logout" onClick={onLogout} className="flex items-center gap-2 text-sm text-[#9B8E7A] hover:text-[#A5B276]"><LogOut size={16} />Esci</button>
    </aside>
);

const AdminDashboard = () => {
    const [tab, setTab] = useState("menu");
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [orders, setOrders] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [printQueue, setPrintQueue] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [activeCat, setActiveCat] = useState("all");
    const nav = useNavigate();

    const loadMenu = async () => {
        const [c, i] = await Promise.all([api.get("/menu/categories"), api.get("/admin/menu/items")]);
        setCategories(c.data); setItems(i.data);
    };

    const loadAll = async () => {
        try {
            await loadMenu();
            const [o, r] = await Promise.all([api.get("/admin/orders"), api.get("/admin/reservations")]);
            setOrders(o.data); setReservations(r.data);
        } catch (err) {
            if (err?.response?.status === 401) { localStorage.removeItem("tierra_admin_token"); nav("/admin"); }
        }
    };

    const loadPrintQueue = async () => {
        try {
            const { data } = await api.get("/admin/print/queue");
            setPrintQueue(data);
        } catch { /* ignore */ }
    };

    useEffect(() => {
        if (!localStorage.getItem("tierra_admin_token")) return nav("/admin");
        loadAll();
    }, []);

    useEffect(() => {
        if (tab === "printer") loadPrintQueue();
    }, [tab]);

    const logout = () => { localStorage.removeItem("tierra_admin_token"); nav("/admin"); };

    const toggleItem = async (id) => {
        try {
            const { data } = await api.post(`/admin/menu/items/${id}/toggle`);
            setItems((prev) => prev.map((it) => it.id === id ? data : it));
            toast.success(data.available ? "Piatto disponibile" : "Piatto esaurito");
        } catch { toast.error("Errore"); }
    };

    const updatePrice = async (id, price) => {
        try {
            const { data } = await api.patch(`/admin/menu/items/${id}`, { price: parseFloat(price) });
            setItems((prev) => prev.map((it) => it.id === id ? data : it));
            toast.success("Prezzo aggiornato");
        } catch { toast.error("Errore"); }
    };

    const deleteItem = async (id, name) => {
        if (!window.confirm(`Eliminare "${name}"?`)) return;
        try {
            await api.delete(`/admin/menu/items/${id}`);
            setItems((prev) => prev.filter((it) => it.id !== id));
            toast.success("Piatto eliminato");
        } catch { toast.error("Errore"); }
    };

    const toggleSpecial = async (item) => {
        try {
            const { data } = await api.post(`/admin/menu/items/${item.id}/special`);
            setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, is_special: data.is_special } : it));
            toast.success(data.is_special ? `${item.name}: Special del Giorno` : `${item.name}: rimosso dagli Special`);
        } catch (e) { toast.error(e?.response?.data?.detail || "Errore"); }
    };

    const applyItemUpdate = (updated) => {
        setItems((prev) => prev.map((it) => it.id === updated.id ? updated : it));
    };

    const specialsCount = items.filter((i) => i.is_special).length;

    const reprintOrder = async (orderId) => {
        try {
            await api.post(`/admin/print/reprint/${orderId}`);
            toast.success("Comanda inviata in coda di stampa");
            loadPrintQueue();
        } catch (e) { toast.error(e?.response?.data?.detail || "Errore"); }
    };

    const filteredItems = activeCat === "all" ? items : items.filter((i) => i.category_slug === activeCat);

    return (
        <div data-testid="admin-dashboard" className="min-h-screen bg-[#F4F2EC]">
            <Sidebar active={tab} onNav={setTab} onLogout={logout} />
            <main className="lg:ml-64 p-6 lg:p-10">
                <div className="flex gap-2 mb-8 lg:hidden overflow-x-auto">
                    {[["menu","Menù"],["orders","Ordini"],["reservations","Prenot."],["stats","Stats"],["marketing","Marketing"],["printer","Stampante"]].map(([id,label]) => (
                        <button key={id} onClick={() => setTab(id)} data-testid={`mobile-tab-${id}`} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${tab === id ? "bg-[#7C9A4A] text-[#FFFDF7]" : "bg-white border border-[#8A5B3D]/20"}`}>{label}</button>
                    ))}
                    <button onClick={logout} className="px-4 py-2 rounded-full text-sm bg-white border border-[#8A5B3D]/20">Esci</button>
                </div>

                {tab === "menu" && (
                    <section>
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <p className="overline">Gestione menù</p>
                                <h2 className="h-display text-4xl mt-2">Piatti</h2>
                                <p className="text-sm text-[#5C4E3C] mt-1">Aggiungi, modifica, elimina. Accendi lo switch per rendere il piatto disponibile.</p>
                            </div>
                            <button
                                data-testid="add-item-btn"
                                onClick={() => { setEditingItem(null); setDialogOpen(true); }}
                                className="btn-brand"
                            ><Plus size={16} /> Nuovo piatto</button>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2">
                            <button onClick={() => setActiveCat("all")} className={`px-4 py-1.5 rounded-full text-xs font-medium ${activeCat === "all" ? "bg-[#7C9A4A] text-white" : "bg-white border border-[#8A5B3D]/20"}`}>Tutte ({items.length})</button>
                            {categories.map((c) => {
                                const count = items.filter((i) => i.category_slug === c.slug).length;
                                return (
                                    <button key={c.slug} onClick={() => setActiveCat(c.slug)} data-testid={`filter-cat-${c.slug}`} className={`px-4 py-1.5 rounded-full text-xs font-medium ${activeCat === c.slug ? "bg-[#7C9A4A] text-white" : "bg-white border border-[#8A5B3D]/20"}`}>{c.name} ({count})</button>
                                );
                            })}
                        </div>

                        <div className="mt-4 flex items-center gap-3 text-xs text-[#5C4E3C]">
                            <span className="overline flex items-center gap-1"><Sparkles size={13} className="text-[#C89B3C]" /> Special del Giorno</span>
                            <span>{specialsCount}/4 attivi</span>
                        </div>

                        <div className="mt-6 space-y-3">
                            {filteredItems.length === 0 && (
                                <div className="text-center py-12 text-[#9B8E7A] bg-white rounded-2xl border border-[#8A5B3D]/10">Nessun piatto in questa categoria.</div>
                            )}
                            {filteredItems.map((it) => (
                                <MenuRowCard
                                    key={it.id}
                                    item={it}
                                    specialsCount={specialsCount}
                                    onToggle={toggleItem}
                                    onToggleSpecial={toggleSpecial}
                                    onUpdatePrice={updatePrice}
                                    onEdit={() => { setEditingItem(it); setDialogOpen(true); }}
                                    onDelete={() => deleteItem(it.id, it.name)}
                                    onItemUpdated={applyItemUpdate}
                                />
                            ))}
                        </div>

                        <MenuItemDialog
                            open={dialogOpen}
                            onOpenChange={setDialogOpen}
                            categories={categories}
                            item={editingItem}
                            onSaved={loadMenu}
                        />
                    </section>
                )}

                {tab === "orders" && (
                    <section>
                        <p className="overline">Ordini</p>
                        <h2 className="h-display text-4xl mt-2">Ultimi ordini</h2>
                        <div className="mt-8 space-y-4">
                            {orders.length === 0 ? <p className="text-[#5C4E3C] italic">Nessun ordine ancora.</p> : orders.map((o) => (
                                <div key={o.id} data-testid={`order-row-${o.id}`} className="bg-white rounded-xl p-5 border border-[#8A5B3D]/10">
                                    <div className="flex justify-between items-start gap-4 flex-wrap">
                                        <div>
                                            <p className="font-medium">{o.customer_name} <span className="text-[#5C4E3C] text-sm">· {o.customer_phone}</span></p>
                                            <p className="text-xs text-[#5C4E3C] mt-1">{o.service_type} · {new Date(o.created_at).toLocaleString("it-IT")}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-serif text-2xl text-[#7C9A4A]">€ {o.total.toFixed(2)}</p>
                                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${o.payment_status === "paid" ? "bg-[#7C9A4A]/15 text-[#5E7F32]" : "bg-[#8A5B3D]/15 text-[#8A5B3D]"}`}>{o.payment_status}</span>
                                        </div>
                                    </div>
                                    <ul className="mt-3 text-sm text-[#5C4E3C] space-y-1">
                                        {o.items.map((li, idx) => <li key={idx}>{li.quantity}× {li.name} <span className="text-[#9B8E7A]">€ {(li.price * li.quantity).toFixed(2)}</span></li>)}
                                    </ul>
                                    {o.delivery_address && <p className="mt-2 text-xs text-[#5C4E3C]">📍 {o.delivery_address}</p>}
                                    {o.notes && <p className="mt-1 text-xs text-[#5C4E3C] italic">Note: {o.notes}</p>}
                                    {o.marketing_consent && (
                                        <p className="mt-2 text-[11px] inline-flex items-center gap-1 bg-[#C89B3C]/15 text-[#8A6A14] px-2 py-0.5 rounded-full">
                                            <Megaphone size={10} /> Consenso marketing
                                        </p>
                                    )}
                                    <div className="mt-4 pt-3 border-t border-[#8A5B3D]/10 flex justify-end">
                                        <button data-testid={`reprint-${o.id}`} onClick={() => reprintOrder(o.id)} className="inline-flex items-center gap-2 text-xs text-[#8A5B3D] hover:text-[#6F4527]"><Printer size={14} /> Ristampa comanda</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {tab === "reservations" && (
                    <section>
                        <p className="overline">Prenotazioni</p>
                        <h2 className="h-display text-4xl mt-2">Richieste tavolo</h2>
                        <div className="mt-8 space-y-4">
                            {reservations.length === 0 ? <p className="text-[#5C4E3C] italic">Nessuna prenotazione.</p> : reservations.map((r) => (
                                <div key={r.id} data-testid={`reservation-row-${r.id}`} className="bg-white rounded-xl p-5 border border-[#8A5B3D]/10 flex justify-between items-start gap-4 flex-wrap">
                                    <div>
                                        <p className="font-medium">{r.customer_name} <span className="text-[#5C4E3C] text-sm">· {r.customer_phone}</span></p>
                                        <p className="text-sm text-[#5C4E3C]">{r.customer_email}</p>
                                        {r.notes && <p className="mt-2 text-xs italic text-[#5C4E3C]">Note: {r.notes}</p>}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-serif text-2xl text-[#7C9A4A]">{r.date} · {r.time}</p>
                                        <p className="text-sm text-[#5C4E3C]">{r.guests} {r.guests === 1 ? "ospite" : "ospiti"}</p>
                                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-[#8A5B3D]/15 text-[#8A5B3D]">{r.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {tab === "printer" && <PrinterPanel queue={printQueue} onRefresh={loadPrintQueue} />}
                {tab === "stats" && <StatsPanel />}
                {tab === "marketing" && <MarketingPanel />}
            </main>
        </div>
    );
};

const MenuRowCard = ({ item, specialsCount, onToggle, onToggleSpecial, onUpdatePrice, onEdit, onDelete, onItemUpdated }) => {
    const [editing, setEditing] = useState(false);
    const [price, setPrice] = useState(item.price.toFixed(2));
    const specialDisabled = !item.is_special && specialsCount >= 4;

    return (
        <div data-testid={`menu-row-${item.id}`} className={`bg-white rounded-2xl border transition-colors overflow-hidden ${item.is_special ? "border-[#C89B3C]/40 ring-1 ring-[#C89B3C]/20" : "border-[#8A5B3D]/10"}`}>
            <div className="flex items-center gap-4 p-4">
                {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#EADFC9] flex items-center justify-center text-[#8A5B3D] text-xs font-serif italic shrink-0">Tierra</div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-[#2C2418] truncate">{item.name}</p>
                        {item.is_special && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-[#C89B3C]/15 text-[#8A6A14] px-2 py-0.5 rounded-full font-semibold tracking-wider uppercase">
                                <Sparkles size={10} /> Special
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-[#5C4E3C] capitalize mt-0.5">{item.category_slug.replace(/-/g, " / ")}</p>
                </div>

                <div className="hidden md:block text-right">
                    {editing ? (
                        <div className="flex items-center justify-end gap-1">
                            <input data-testid={`price-input-${item.id}`} value={price} onChange={(e) => setPrice(e.target.value)} className="w-20 px-2 py-1 text-right border border-[#8A5B3D]/25 rounded text-sm" />
                            <button data-testid={`save-price-${item.id}`} onClick={async () => { await onUpdatePrice(item.id, price); setEditing(false); }} className="text-[#5E7F32] p-1"><Check size={14} /></button>
                            <button onClick={() => { setEditing(false); setPrice(item.price.toFixed(2)); }} className="text-[#923F28] p-1"><X size={14} /></button>
                        </div>
                    ) : (
                        <button data-testid={`edit-price-${item.id}`} onClick={() => setEditing(true)} className="text-sm text-[#2C2418] hover:text-[#8A5B3D] inline-flex items-center gap-1">
                            € {item.price.toFixed(2)} <Edit2 size={12} className="text-[#9B8E7A]" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex flex-col items-center gap-0.5" title={item.is_special ? "Rimuovi dagli Special" : specialDisabled ? "Massimo 4 Special attivi" : "Imposta come Special del Giorno"}>
                        <Switch
                            data-testid={`special-${item.id}`}
                            checked={!!item.is_special}
                            disabled={specialDisabled}
                            onCheckedChange={() => !specialDisabled && onToggleSpecial(item)}
                            className="data-[state=checked]:bg-[#C89B3C]"
                        />
                        <span className="text-[9px] uppercase tracking-widest text-[#9B8E7A]">Special</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5" title="Disponibile a menu">
                        <Switch data-testid={`toggle-${item.id}`} checked={item.available} onCheckedChange={() => onToggle(item.id)} />
                        <span className="text-[9px] uppercase tracking-widest text-[#9B8E7A]">Attivo</span>
                    </div>
                    <div className="flex gap-1">
                        <button data-testid={`edit-${item.id}`} onClick={onEdit} className="p-2 hover:bg-[#F5EFE2] rounded" title="Modifica"><Edit2 size={14} /></button>
                        <button data-testid={`delete-${item.id}`} onClick={onDelete} className="p-2 hover:bg-[#F5EFE2] rounded text-[#923F28]" title="Elimina"><Trash2 size={14} /></button>
                    </div>
                </div>
            </div>
            <CustomizationOptionsPanel item={item} onUpdated={onItemUpdated} />
        </div>
    );
};

const PrinterPanel = ({ queue, onRefresh }) => (
    <section>
        <div className="flex justify-between items-start gap-4 flex-wrap">
            <div>
                <p className="overline">Stampante comande</p>
                <h2 className="h-display text-4xl mt-2">Sunmi Cloud Printer</h2>
                <p className="text-sm text-[#5C4E3C] mt-1">Ogni ordine pagato viene messo in coda e stampato automaticamente dal Mac del locale.</p>
            </div>
            <button onClick={onRefresh} className="btn-outline-brand"><RefreshCw size={14} /> Aggiorna coda</button>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-[#8A5B3D]/10 p-6">
                <h3 className="font-serif text-2xl flex items-center gap-3"><Printer size={22} /> Configurazione rapida</h3>
                <ol className="mt-5 space-y-4 text-sm text-[#5C4E3C] list-decimal list-inside">
                    <li>
                        <a data-testid="download-print-agent" href="/tierra_print_agent.py" download className="inline-flex items-center gap-2 text-[#7C9A4A] hover:text-[#5E7F32] underline">
                            <Download size={14} /> Scarica <code className="text-xs bg-[#F5EFE2] px-1.5 py-0.5 rounded">tierra_print_agent.py</code>
                        </a> sul Mac del locale
                    </li>
                    <li>
                        Trova l'IP della Sunmi (tieni premuto il tasto FEED alla base, stampa auto-test) e apri il file con TextEdit per sostituire <code className="text-xs bg-[#F5EFE2] px-1 rounded">PRINTER_IP</code>
                    </li>
                    <li>Apri il <strong>Terminale</strong> e lancia:
                        <pre className="mt-2 bg-[#2C2418] text-[#F5EFE2] p-3 rounded-lg text-xs overflow-x-auto">python3 tierra_print_agent.py</pre>
                    </li>
                    <li>Per farlo partire da solo all'accensione del Mac, aggiungilo agli <em>Elementi login</em> (Preferenze → Utenti → Elementi login)</li>
                </ol>
                <div className="mt-6 pt-5 border-t border-[#8A5B3D]/10 text-xs text-[#5C4E3C]">
                    <p className="overline">Token agente</p>
                    <code className="mt-2 block bg-[#F5EFE2] p-2 rounded font-mono">tierra-print-agent-8f2c3d5e</code>
                    <p className="mt-2 text-[11px] text-[#9B8E7A]">Già pre-configurato nel file. Non condividere pubblicamente.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#8A5B3D]/10 p-6">
                <h3 className="font-serif text-2xl">Coda di stampa</h3>
                <p className="text-xs text-[#9B8E7A] mt-1">Ultimi 100 job.</p>
                <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto">
                    {queue.length === 0 ? <p className="text-[#9B8E7A] italic text-sm">Nessun job.</p> : queue.map((j) => (
                        <div key={j.id} className="flex items-center justify-between text-xs px-3 py-2 bg-[#F5EFE2] rounded-lg">
                            <span className="font-mono text-[#5C4E3C]">#{j.order_id.slice(0, 8)}</span>
                            <span className="text-[#9B8E7A]">{new Date(j.created_at).toLocaleString("it-IT")}</span>
                            <span className={`px-2 py-0.5 rounded-full ${
                                j.status === "printed" ? "bg-[#7C9A4A]/15 text-[#5E7F32]" :
                                j.status === "failed" ? "bg-[#923F28]/15 text-[#923F28]" :
                                "bg-[#8A5B3D]/15 text-[#8A5B3D]"
                            }`}>{j.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </section>
);

export default AdminDashboard;
