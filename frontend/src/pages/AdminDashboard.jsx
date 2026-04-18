import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LayoutGrid, UtensilsCrossed, ShoppingBag, CalendarDays, LogOut, Edit2, Check, X } from "lucide-react";
import { Switch } from "../components/ui/switch";
import { api } from "../lib/api";

const Sidebar = ({ active, onNav, onLogout }) => (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#1C231A] text-[#F9F6F0] p-6 hidden lg:flex flex-col">
        <div>
            <p className="overline text-[#C46D46]">Admin</p>
            <h1 className="font-serif italic text-3xl mt-2">Tierra</h1>
        </div>
        <nav className="mt-12 flex-1 space-y-1 text-sm">
            {[
                { id: "menu", icon: UtensilsCrossed, label: "Menù" },
                { id: "orders", icon: ShoppingBag, label: "Ordini" },
                { id: "reservations", icon: CalendarDays, label: "Prenotazioni" },
            ].map((it) => (
                <button key={it.id} data-testid={`sidebar-${it.id}`} onClick={() => onNav(it.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active === it.id ? "bg-white/10 text-[#C46D46]" : "hover:bg-white/5"}`}>
                    <it.icon size={16} strokeWidth={1.5} />{it.label}
                </button>
            ))}
        </nav>
        <button data-testid="admin-logout" onClick={onLogout} className="flex items-center gap-2 text-sm text-[#8A9486] hover:text-[#C46D46]"><LogOut size={16} />Esci</button>
    </aside>
);

const AdminDashboard = () => {
    const [tab, setTab] = useState("menu");
    const [items, setItems] = useState([]);
    const [orders, setOrders] = useState([]);
    const [reservations, setReservations] = useState([]);
    const nav = useNavigate();

    const loadAll = async () => {
        try {
            const [i, o, r] = await Promise.all([
                api.get("/menu/items"),
                api.get("/admin/orders"),
                api.get("/admin/reservations"),
            ]);
            setItems(i.data); setOrders(o.data); setReservations(r.data);
        } catch (err) {
            if (err?.response?.status === 401) { localStorage.removeItem("tierra_admin_token"); nav("/admin"); }
        }
    };

    useEffect(() => {
        if (!localStorage.getItem("tierra_admin_token")) return nav("/admin");
        loadAll();
    }, []);

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

    return (
        <div data-testid="admin-dashboard" className="min-h-screen bg-[#F4F5F2]">
            <Sidebar active={tab} onNav={setTab} onLogout={logout} />
            <main className="lg:ml-64 p-6 lg:p-10">
                {/* Mobile tabs */}
                <div className="flex gap-2 mb-8 lg:hidden overflow-x-auto">
                    {["menu", "orders", "reservations"].map((id) => (
                        <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${tab === id ? "bg-[#2B4A33] text-[#F9F6F0]" : "bg-white border border-[#2B4A33]/15"}`}>{id}</button>
                    ))}
                    <button onClick={logout} className="px-4 py-2 rounded-full text-sm bg-white border border-[#2B4A33]/15">Esci</button>
                </div>

                {tab === "menu" && (
                    <section>
                        <div className="flex items-baseline justify-between">
                            <div>
                                <p className="overline">Gestione menù</p>
                                <h2 className="h-display text-4xl mt-2">Piatti</h2>
                                <p className="text-sm text-[#515E4C] mt-1">Accendi o spegni la disponibilità. Modifica il prezzo con un click.</p>
                            </div>
                            <span className="text-sm text-[#515E4C]">{items.length} piatti totali</span>
                        </div>

                        <div className="mt-8 bg-white rounded-2xl border border-[#2B4A33]/10 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-[#F9F6F0] text-[#515E4C]">
                                    <tr>
                                        <th className="text-left px-5 py-3 font-medium">Piatto</th>
                                        <th className="text-left px-5 py-3 font-medium">Categoria</th>
                                        <th className="text-right px-5 py-3 font-medium">Prezzo €</th>
                                        <th className="text-center px-5 py-3 font-medium">Disponibile</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it) => (
                                        <MenuRow key={it.id} item={it} onToggle={toggleItem} onUpdatePrice={updatePrice} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {tab === "orders" && (
                    <section>
                        <p className="overline">Ordini</p>
                        <h2 className="h-display text-4xl mt-2">Ultimi ordini</h2>
                        <div className="mt-8 space-y-4">
                            {orders.length === 0 ? <p className="text-[#515E4C] italic">Nessun ordine ancora.</p> : orders.map((o) => (
                                <div key={o.id} data-testid={`order-row-${o.id}`} className="bg-white rounded-xl p-5 border border-[#2B4A33]/10">
                                    <div className="flex justify-between items-start gap-4 flex-wrap">
                                        <div>
                                            <p className="font-medium">{o.customer_name} <span className="text-[#515E4C] text-sm">· {o.customer_phone}</span></p>
                                            <p className="text-xs text-[#515E4C] mt-1">{o.service_type} · {new Date(o.created_at).toLocaleString("it-IT")}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-serif text-2xl text-[#2B4A33]">€ {o.total.toFixed(2)}</p>
                                            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${o.payment_status === "paid" ? "bg-[#3C6E47]/15 text-[#3C6E47]" : "bg-[#C46D46]/15 text-[#C46D46]"}`}>{o.payment_status}</span>
                                        </div>
                                    </div>
                                    <ul className="mt-3 text-sm text-[#515E4C] space-y-1">
                                        {o.items.map((li, idx) => <li key={idx}>{li.quantity}× {li.name} <span className="text-[#8A9486]">€ {(li.price * li.quantity).toFixed(2)}</span></li>)}
                                    </ul>
                                    {o.delivery_address && <p className="mt-2 text-xs text-[#515E4C]">📍 {o.delivery_address}</p>}
                                    {o.notes && <p className="mt-1 text-xs text-[#515E4C] italic">Note: {o.notes}</p>}
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
                            {reservations.length === 0 ? <p className="text-[#515E4C] italic">Nessuna prenotazione.</p> : reservations.map((r) => (
                                <div key={r.id} data-testid={`reservation-row-${r.id}`} className="bg-white rounded-xl p-5 border border-[#2B4A33]/10 flex justify-between items-start gap-4 flex-wrap">
                                    <div>
                                        <p className="font-medium">{r.customer_name} <span className="text-[#515E4C] text-sm">· {r.customer_phone}</span></p>
                                        <p className="text-sm text-[#515E4C]">{r.customer_email}</p>
                                        {r.notes && <p className="mt-2 text-xs italic text-[#515E4C]">Note: {r.notes}</p>}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-serif text-2xl text-[#2B4A33]">{r.date} · {r.time}</p>
                                        <p className="text-sm text-[#515E4C]">{r.guests} {r.guests === 1 ? "ospite" : "ospiti"}</p>
                                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-[#C46D46]/15 text-[#C46D46]">{r.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

const MenuRow = ({ item, onToggle, onUpdatePrice }) => {
    const [editing, setEditing] = useState(false);
    const [price, setPrice] = useState(item.price.toFixed(2));
    return (
        <tr data-testid={`menu-row-${item.id}`} className="border-t border-[#2B4A33]/5">
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    {item.image_url ? <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-[#F1EBE1]" />}
                    <div>
                        <p className="font-medium">{item.name}</p>
                        {item.badge && <p className="text-xs text-[#C46D46]">{item.badge}</p>}
                    </div>
                </div>
            </td>
            <td className="px-5 py-4 text-[#515E4C] capitalize">{item.category_slug.replace(/-/g, " / ")}</td>
            <td className="px-5 py-4 text-right">
                {editing ? (
                    <div className="flex items-center justify-end gap-2">
                        <input data-testid={`price-input-${item.id}`} value={price} onChange={(e) => setPrice(e.target.value)} className="w-20 px-2 py-1 text-right border rounded" />
                        <button data-testid={`save-price-${item.id}`} onClick={async () => { await onUpdatePrice(item.id, price); setEditing(false); }} className="text-[#3C6E47]"><Check size={16} /></button>
                        <button onClick={() => { setEditing(false); setPrice(item.price.toFixed(2)); }} className="text-[#963A3A]"><X size={16} /></button>
                    </div>
                ) : (
                    <div className="flex items-center justify-end gap-2">
                        <span>{item.price.toFixed(2)}</span>
                        <button data-testid={`edit-price-${item.id}`} onClick={() => setEditing(true)} className="text-[#8A9486] hover:text-[#2B4A33]"><Edit2 size={14} /></button>
                    </div>
                )}
            </td>
            <td className="px-5 py-4 text-center">
                <Switch data-testid={`toggle-${item.id}`} checked={item.available} onCheckedChange={() => onToggle(item.id)} />
            </td>
        </tr>
    );
};

export default AdminDashboard;
