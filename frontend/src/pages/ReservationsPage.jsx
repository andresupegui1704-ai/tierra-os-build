import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Users, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "../components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { format } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import { api } from "../lib/api";

const TIME_SLOTS = [
    "12:30", "13:00", "13:30", "14:00",
    "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
];

const ReservationsPage = () => {
    const [form, setForm] = useState({
        customer_name: "", customer_phone: "", customer_email: "",
        date: null, time: "", guests: "2", notes: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(null);
    const [availability, setAvailability] = useState(null);
    const [checkingAvail, setCheckingAvail] = useState(false);

    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    // Live check availability when date+time+guests are all filled
    useEffect(() => {
        const { date, time, guests } = form;
        if (!date || !time || !guests) {
            setAvailability(null);
            return;
        }
        setCheckingAvail(true);
        const dateStr = format(date, "yyyy-MM-dd");
        const controller = new AbortController();
        api.get(`/reservations/availability?date=${dateStr}&time=${time}&guests=${guests}`, { signal: controller.signal })
            .then((r) => setAvailability(r.data))
            .catch(() => setAvailability(null))
            .finally(() => setCheckingAvail(false));
        return () => controller.abort();
    }, [form.date, form.time, form.guests]);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.customer_name || !form.customer_phone || !form.customer_email)
            return toast.error("Compila nome, telefono ed email");
        if (!form.date) return toast.error("Seleziona una data");
        if (!form.time) return toast.error("Seleziona un orario");
        if (availability && !availability.can_fit) {
            return toast.error("Fascia oraria satura — scegli un altro orario");
        }

        setSubmitting(true);
        try {
            const payload = {
                customer_name: form.customer_name,
                customer_phone: form.customer_phone,
                customer_email: form.customer_email,
                date: format(form.date, "yyyy-MM-dd"),
                time: form.time,
                guests: parseInt(form.guests, 10),
                notes: form.notes || null,
            };
            const { data } = await api.post("/reservations", payload);
            setSuccess(data);
            toast.success("Richiesta ricevuta — ti confermeremo a breve");
        } catch (err) {
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === "string" ? detail : (detail?.message || "Errore nella prenotazione");
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div data-testid="reservation-success" className="pt-28 pb-20 min-h-screen bg-[#F9F6F0]">
                <div className="max-w-2xl mx-auto px-6">
                    <div className="bg-white rounded-3xl p-10 border border-[#2B4A33]/10 text-center">
                        <p className="overline text-[#3C6E47]">Richiesta inviata</p>
                        <h1 className="h-display text-4xl mt-4">Grazie, <span className="italic">{success.customer_name}</span>!</h1>
                        <p className="mt-4 text-[#515E4C]">
                            Abbiamo ricevuto la tua richiesta per <strong>{success.date}</strong> alle <strong>{success.time}</strong> per <strong>{success.guests}</strong> persone.
                        </p>
                        <div className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#C89B3C] bg-[#FCF5E3] px-4 py-2 rounded-full">
                            <span className="inline-block w-2 h-2 rounded-full bg-[#C89B3C] animate-pulse" />
                            In attesa di conferma
                        </div>
                        <p className="mt-4 text-sm text-[#515E4C]">
                            Riceverai un'email di conferma non appena il nostro team verificherà la disponibilità.
                        </p>
                        <button onClick={() => { setSuccess(null); setForm({ customer_name: "", customer_phone: "", customer_email: "", date: null, time: "", guests: "2", notes: "" }); }} className="btn-outline-brand mt-6">Nuova prenotazione</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div data-testid="reservations-page" className="pt-24 pb-20 min-h-screen bg-[#F9F6F0]">
            <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <p className="overline">Prenotazione</p>
                <h1 className="h-display text-5xl sm:text-6xl mt-5">Riserva il tuo <span className="italic text-[#C46D46]">tavolo</span>.</h1>
                <p className="mt-6 text-[#515E4C]">Confermeremo la tua richiesta via email entro poche ore. Per esigenze speciali, scrivici su WhatsApp.</p>
            </section>

            <form onSubmit={submit} data-testid="reservation-form" className="mt-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-3xl p-8 sm:p-10 border border-[#2B4A33]/10 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <LabelledInput id="res-name" label="Nome e cognome" value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} required />
                        <LabelledInput id="res-phone" label="Telefono" value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} required />
                    </div>
                    <LabelledInput id="res-email" type="email" label="Email" value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} required />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Date */}
                        <div>
                            <label className="overline block mb-2">Data</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button type="button" data-testid="res-date-trigger" className="w-full flex items-center gap-2 rounded-xl bg-[#F9F6F0] px-4 py-3 text-sm text-left hover:bg-[#F1EBE1] transition-colors">
                                        <CalendarIcon size={16} className="text-[#2B4A33]" />
                                        {form.date ? format(form.date, "EEEE d MMMM", { locale: itLocale }) : <span className="text-[#8A9486]">Seleziona</span>}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-auto" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={form.date}
                                        onSelect={(d) => update("date", d)}
                                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                                        locale={itLocale}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        {/* Time */}
                        <div>
                            <label className="overline block mb-2">Orario</label>
                            <Select value={form.time} onValueChange={(v) => update("time", v)}>
                                <SelectTrigger data-testid="res-time-trigger" className="rounded-xl bg-[#F9F6F0] border-transparent py-6">
                                    <div className="flex items-center gap-2"><Clock size={16} className="text-[#2B4A33]" /><SelectValue placeholder="Seleziona" /></div>
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_SLOTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Guests */}
                        <div>
                            <label className="overline block mb-2">Ospiti</label>
                            <Select value={form.guests} onValueChange={(v) => update("guests", v)}>
                                <SelectTrigger data-testid="res-guests-trigger" className="rounded-xl bg-[#F9F6F0] border-transparent py-6">
                                    <div className="flex items-center gap-2"><Users size={16} className="text-[#2B4A33]" /><SelectValue /></div>
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
                                        <SelectItem key={n} value={String(n)}>{n} {n === 1 ? "persona" : "persone"}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <label className="overline block mb-2">Note (allergie, compleanni, richieste speciali)</label>
                        <textarea data-testid="res-notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="w-full rounded-xl bg-[#F9F6F0] border-transparent focus:border-[#2B4A33] focus:ring-1 focus:ring-[#2B4A33] px-4 py-3 text-sm outline-none" />
                    </div>

                    {/* Live availability feedback */}
                    {availability && !checkingAvail && (
                        <div
                            data-testid="res-availability-banner"
                            className={`rounded-xl px-4 py-3 border flex items-start gap-3 text-sm ${
                                availability.can_fit
                                    ? "bg-[#7C9A4A]/10 border-[#7C9A4A]/30 text-[#3E5822]"
                                    : "bg-[#923F28]/10 border-[#923F28]/30 text-[#923F28]"
                            }`}
                        >
                            {availability.can_fit
                                ? <CheckCircle2 size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                                : <AlertTriangle size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" />}
                            <div className="flex-1">
                                <p className="font-medium">
                                    Fascia {availability.slot_start}–{availability.slot_end} · {availability.can_fit ? "Disponibile" : "Satura"}
                                </p>
                                <p className="mt-0.5 text-xs opacity-80">
                                    {availability.booked_total}/{availability.max_total} coperti prenotati
                                    {availability.remaining_total > 0
                                        ? ` · restano ${availability.remaining_total} posti`
                                        : " · prova un'altra fascia oraria"}
                                </p>
                            </div>
                        </div>
                    )}

                    <button data-testid="submit-reservation-btn" disabled={submitting || (availability && !availability.can_fit)} className="btn-brand w-full justify-center disabled:opacity-60">
                        {submitting ? "Invio in corso..." : "Invia richiesta"}
                    </button>
                </div>
            </form>
        </div>
    );
};

const LabelledInput = ({ id, label, ...props }) => (
    <div>
        <label htmlFor={id} className="overline block mb-2">{label}</label>
        <input id={id} data-testid={id} {...props} className="w-full rounded-xl bg-[#F9F6F0] border border-transparent focus:border-[#2B4A33] focus:ring-1 focus:ring-[#2B4A33] px-4 py-3 text-sm outline-none" />
    </div>
);

export default ReservationsPage;
