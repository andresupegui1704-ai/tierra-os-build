import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BarChart3, TrendingUp, Euro, ShoppingCart, Download } from "lucide-react";
import { api } from "../../lib/api";

const monthRange = (offset = 0) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + offset;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: start.toLocaleDateString("it-IT", { month: "long", year: "numeric" }) };
};

const PRESETS = [
    { id: "today", label: "Oggi", compute: () => {
        const s = new Date(); s.setHours(0,0,0,0);
        const e = new Date(); e.setHours(23,59,59,999);
        return { start: s.toISOString(), end: e.toISOString() };
    }},
    { id: "7d", label: "Ultimi 7 giorni", compute: () => {
        const e = new Date();
        const s = new Date(); s.setDate(s.getDate() - 6); s.setHours(0,0,0,0);
        return { start: s.toISOString(), end: e.toISOString() };
    }},
    { id: "30d", label: "Ultimi 30 giorni", compute: () => {
        const e = new Date();
        const s = new Date(); s.setDate(s.getDate() - 29); s.setHours(0,0,0,0);
        return { start: s.toISOString(), end: e.toISOString() };
    }},
    { id: "month", label: "Questo mese", compute: () => monthRange(0) },
    { id: "prev_month", label: "Mese scorso", compute: () => monthRange(-1) },
    { id: "all", label: "Sempre", compute: () => ({ start: null, end: null }) },
];

export const StatsPanel = () => {
    const [preset, setPreset] = useState("month");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const { start, end } = useMemo(() => {
        const p = PRESETS.find((x) => x.id === preset);
        return p.compute();
    }, [preset]);

    useEffect(() => {
        setLoading(true);
        const params = {};
        if (start) params.start = start;
        if (end) params.end = end;
        api.get("/admin/stats/sales", { params })
            .then((r) => setData(r.data))
            .catch(() => toast.error("Errore nel caricamento statistiche"))
            .finally(() => setLoading(false));
    }, [start, end]);

    const exportCSV = () => {
        if (!data?.items?.length) return;
        const rows = [
            ["Piatto", "Quantità", "Ricavato (€)", "Ordini distinti"],
            ...data.items.map((i) => [i.name, i.quantity, i.revenue.toFixed(2), i.orders_count]),
        ];
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tierra-statistiche-${preset}-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const maxQty = data?.items?.[0]?.quantity || 1;

    return (
        <section data-testid="admin-stats-panel">
            <p className="overline">Statistiche</p>
            <h2 className="h-display text-4xl mt-2">Vendite</h2>
            <p className="text-sm text-[#5C4E3C] mt-1">Analizza quanto hai venduto di ogni piatto e identifica i tuoi best-seller.</p>

            {/* Preset filters */}
            <div className="mt-6 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                    <button
                        key={p.id}
                        data-testid={`stats-preset-${p.id}`}
                        onClick={() => setPreset(p.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            preset === p.id ? "bg-[#7C9A4A] text-white" : "bg-white border border-[#8A5B3D]/20 hover:bg-[#F5EFE2]"
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* KPI cards */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard icon={Euro} label="Ricavato" value={`€ ${(data?.totals?.revenue ?? 0).toFixed(2)}`} loading={loading} accent="#7C9A4A" />
                <KpiCard icon={ShoppingCart} label="Ordini pagati" value={data?.totals?.orders ?? 0} loading={loading} accent="#8A5B3D" />
                <KpiCard icon={TrendingUp} label="Scontrino medio" value={`€ ${(data?.totals?.avg_ticket ?? 0).toFixed(2)}`} loading={loading} accent="#C89B3C" />
            </div>

            {/* Per-item ranking */}
            <div className="mt-8 bg-white rounded-2xl border border-[#8A5B3D]/10 p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                    <h3 className="font-serif text-2xl flex items-center gap-2"><BarChart3 size={22} /> Piatti più venduti</h3>
                    <button
                        data-testid="stats-export-csv"
                        onClick={exportCSV}
                        disabled={!data?.items?.length}
                        className="inline-flex items-center gap-2 text-xs text-[#7C9A4A] hover:text-[#5E7F32] disabled:opacity-40"
                    >
                        <Download size={14} /> Esporta CSV
                    </button>
                </div>

                {loading ? (
                    <p className="text-[#9B8E7A] italic py-8 text-center">Caricamento...</p>
                ) : !data?.items?.length ? (
                    <p className="text-[#9B8E7A] italic py-8 text-center">Nessun ordine pagato nel periodo selezionato.</p>
                ) : (
                    <div className="space-y-2">
                        {data.items.map((it, idx) => {
                            const pct = Math.max(3, Math.round((it.quantity / maxQty) * 100));
                            return (
                                <div key={it.item_id || idx} data-testid={`stats-row-${idx}`} className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-[#7C9A4A]/15 to-[#7C9A4A]/5"
                                        style={{ width: `${pct}%` }}
                                    />
                                    <div className="relative flex items-center gap-3 px-3 py-3 text-sm">
                                        <span className="w-6 text-center font-serif text-[#8A5B3D]">#{idx + 1}</span>
                                        <span className="flex-1 text-[#2C2418] font-medium truncate">{it.name}</span>
                                        <span className="text-[#5C4E3C] tabular-nums">
                                            <strong>{it.quantity}</strong> <span className="text-xs text-[#9B8E7A]">pz</span>
                                        </span>
                                        <span className="w-24 text-right text-[#7C9A4A] font-serif tabular-nums">€ {it.revenue.toFixed(2)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

const KpiCard = ({ icon: Icon, label, value, loading, accent }) => (
    <div className="bg-white rounded-2xl p-5 border border-[#8A5B3D]/10">
        <div className="flex items-center gap-2 text-xs text-[#5C4E3C] uppercase tracking-widest">
            <Icon size={14} style={{ color: accent }} />
            {label}
        </div>
        <p className="mt-3 font-serif text-3xl text-[#2C2418]">
            {loading ? <span className="text-[#9B8E7A]">...</span> : value}
        </p>
    </div>
);

export const MarketingPanel = () => {
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        api.get("/admin/marketing/subscribers")
            .then((r) => setSubs(r.data))
            .catch(() => toast.error("Errore nel caricamento iscritti"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const unsubscribe = async (email) => {
        if (!window.confirm(`Disiscrivere ${email}?`)) return;
        try {
            await api.delete(`/admin/marketing/subscribers/${encodeURIComponent(email)}`);
            toast.success("Disiscritto");
            load();
        } catch { toast.error("Errore"); }
    };

    const exportCSV = () => {
        if (!subs.length) return;
        const rows = [
            ["Email", "Nome", "Telefono", "Ordini", "Primo consenso", "Ultimo consenso"],
            ...subs.map((s) => [
                s.email, s.name || "", s.phone || "",
                s.orders_count || 0,
                s.first_consent_at ? new Date(s.first_consent_at).toLocaleString("it-IT") : "",
                s.last_consent_at ? new Date(s.last_consent_at).toLocaleString("it-IT") : "",
            ]),
        ];
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tierra-iscritti-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <section data-testid="admin-marketing-panel">
            <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                    <p className="overline">Marketing</p>
                    <h2 className="h-display text-4xl mt-2">Iscritti alle offerte</h2>
                    <p className="text-sm text-[#5C4E3C] mt-1">Clienti che hanno acconsentito a ricevere promo, menù del giorno e novità via email/WhatsApp.</p>
                </div>
                <button data-testid="marketing-export-csv" onClick={exportCSV} disabled={!subs.length} className="btn-outline-brand disabled:opacity-40">
                    <Download size={14} /> Esporta CSV
                </button>
            </div>

            <div className="mt-6 bg-white rounded-2xl border border-[#8A5B3D]/10 overflow-hidden">
                {loading ? (
                    <p className="p-8 text-center text-[#9B8E7A] italic">Caricamento...</p>
                ) : subs.length === 0 ? (
                    <p className="p-8 text-center text-[#9B8E7A] italic">Nessun iscritto ancora. Il consenso viene raccolto nel checkout.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-[#F5EFE2] text-[10px] uppercase tracking-widest text-[#5C4E3C]">
                            <tr>
                                <th className="text-left px-4 py-3">Email</th>
                                <th className="text-left px-4 py-3 hidden sm:table-cell">Nome</th>
                                <th className="text-left px-4 py-3 hidden sm:table-cell">Telefono</th>
                                <th className="text-right px-4 py-3">Ordini</th>
                                <th className="text-right px-4 py-3 hidden md:table-cell">Iscritto il</th>
                                <th className="text-right px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {subs.map((s) => (
                                <tr key={s.email} data-testid={`subscriber-${s.email}`} className="border-t border-[#8A5B3D]/5">
                                    <td className="px-4 py-3 text-[#2C2418] truncate max-w-[200px]">{s.email}</td>
                                    <td className="px-4 py-3 text-[#5C4E3C] hidden sm:table-cell">{s.name || "—"}</td>
                                    <td className="px-4 py-3 text-[#5C4E3C] hidden sm:table-cell">{s.phone || "—"}</td>
                                    <td className="px-4 py-3 text-right text-[#7C9A4A] font-serif tabular-nums">{s.orders_count || 0}</td>
                                    <td className="px-4 py-3 text-right text-xs text-[#9B8E7A] hidden md:table-cell">
                                        {s.first_consent_at ? new Date(s.first_consent_at).toLocaleDateString("it-IT") : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            data-testid={`unsubscribe-${s.email}`}
                                            onClick={() => unsubscribe(s.email)}
                                            className="text-xs text-[#923F28] hover:underline"
                                        >
                                            Disiscrivi
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
};
