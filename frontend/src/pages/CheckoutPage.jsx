import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Truck, ShoppingBag, Utensils, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useCart } from "../context/CartContext";

const ServiceTile = ({ id, active, onClick, icon: Icon, label, desc }) => (
    <button
        data-testid={`checkout-service-${id}`}
        onClick={onClick}
        type="button"
        className={`text-left p-5 rounded-xl border transition-all ${
            active ? "border-[#2B4A33] bg-[#2B4A33]/5" : "border-[#2B4A33]/15 hover:border-[#2B4A33]/40 bg-white"
        }`}
    >
        <Icon size={22} strokeWidth={1.5} className="text-[#2B4A33]" />
        <div className="mt-3 font-medium text-[#1C231A]">{label}</div>
        <div className="text-xs text-[#515E4C] mt-1">{desc}</div>
    </button>
);

const CheckoutPage = () => {
    const { items, serviceType, setServiceType, subtotal, deliveryFee, total, clear } = useCart();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        customer_name: "", customer_phone: "", customer_email: "",
        delivery_address: "", scheduled_time: "", notes: "",
    });
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        if (items.length === 0) return toast.error("Il tuo carrello è vuoto");
        if (!form.customer_name || !form.customer_phone || !form.customer_email)
            return toast.error("Compila nome, telefono ed email");
        if (serviceType === "delivery" && !form.delivery_address)
            return toast.error("Indica l'indirizzo di consegna");

        setSubmitting(true);
        try {
            const payload = {
                service_type: serviceType,
                items: items.map((i) => ({
                    item_id: i.item_id,
                    name: i.name,
                    price: i.price,
                    quantity: i.quantity,
                    customizations: (i.customizations || []).map((c) => ({
                        group_name: c.group_name,
                        option_names: c.option_names,
                        price_delta: Number(c.price_delta || 0),
                    })),
                })),
                customer_name: form.customer_name,
                customer_phone: form.customer_phone,
                customer_email: form.customer_email,
                delivery_address: serviceType === "delivery" ? form.delivery_address : null,
                scheduled_time: form.scheduled_time || null,
                notes: form.notes || null,
                origin_url: window.location.origin,
                marketing_consent: marketingConsent,
            };
            const { data: order } = await api.post("/orders", payload);
            const { data: session } = await api.post("/payments/checkout", {
                order_id: order.id,
                origin_url: window.location.origin,
            });
            clear();
            // Remember email locally to hide the "first order" review CTA on repeat purchases
            try {
                const seen = JSON.parse(localStorage.getItem("tierra_customer_emails") || "[]");
                const normalized = (form.customer_email || "").toLowerCase().trim();
                if (normalized && !seen.includes(normalized)) {
                    seen.push(normalized);
                    localStorage.setItem("tierra_customer_emails", JSON.stringify(seen));
                }
            } catch { /* ignore storage errors */ }
            window.location.href = session.url;
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Errore durante l'ordine");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div data-testid="checkout-page" className="pt-24 pb-20 bg-[#F9F6F0] min-h-screen">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <p className="overline">Checkout</p>
                <h1 className="h-display text-4xl sm:text-5xl mt-4">Finalizza il tuo <span className="italic text-[#C46D46]">ordine</span></h1>

                <form onSubmit={submit} className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Service type */}
                        <section className="bg-white rounded-2xl p-6 border border-[#2B4A33]/10">
                            <h2 className="font-serif text-2xl mb-4">Modalità</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <ServiceTile id="delivery" icon={Truck} active={serviceType === "delivery"} onClick={() => setServiceType("delivery")} label="Delivery" desc="Consegna a domicilio · €3,50" />
                                <ServiceTile id="asporto" icon={ShoppingBag} active={serviceType === "asporto"} onClick={() => setServiceType("asporto")} label="Asporto" desc="Ritira al bistrot" />
                                <ServiceTile id="preordine" icon={Utensils} active={serviceType === "preordine"} onClick={() => setServiceType("preordine")} label="Preordine" desc="Pronto al tuo arrivo" />
                            </div>
                        </section>

                        {/* Details */}
                        <section className="bg-white rounded-2xl p-6 border border-[#2B4A33]/10">
                            <h2 className="font-serif text-2xl mb-4">I tuoi dati</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input id="name" label="Nome e cognome" value={form.customer_name} onChange={update("customer_name")} required />
                                <Input id="phone" label="Telefono" value={form.customer_phone} onChange={update("customer_phone")} required />
                                <Input id="email" type="email" label="Email" value={form.customer_email} onChange={update("customer_email")} required className="sm:col-span-2" />
                                {serviceType === "delivery" && (
                                    <Input id="address" label="Indirizzo di consegna" value={form.delivery_address} onChange={update("delivery_address")} required className="sm:col-span-2" />
                                )}
                                <Input id="time" label={serviceType === "delivery" ? "Orario desiderato di consegna" : "Orario desiderato"} value={form.scheduled_time} onChange={update("scheduled_time")} placeholder="es. 13:00 oggi" className="sm:col-span-2" />
                                <div className="sm:col-span-2">
                                    <label className="overline block mb-2">Note (allergie, richieste speciali)</label>
                                    <textarea data-testid="checkout-notes" value={form.notes} onChange={update("notes")} rows={3} className="w-full rounded-xl bg-[#F9F6F0] border-transparent focus:border-[#2B4A33] focus:ring-1 focus:ring-[#2B4A33] px-4 py-3 text-sm" />
                                </div>
                            </div>

                            {/* Marketing consent — discreet */}
                            <label className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-[#F9F6F0] border border-[#2B4A33]/10 cursor-pointer hover:border-[#2B4A33]/25 transition-colors">
                                <input
                                    type="checkbox"
                                    data-testid="marketing-consent-checkbox"
                                    checked={marketingConsent}
                                    onChange={(e) => setMarketingConsent(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-[#2B4A33]/30 text-[#7C9A4A] focus:ring-[#7C9A4A]"
                                />
                                <span className="text-xs text-[#5C4E3C] leading-relaxed">
                                    Voglio ricevere <strong>offerte, menù del giorno e novità</strong> da Tierra via email o WhatsApp.
                                    <span className="block mt-1 text-[11px] text-[#8A9486]">
                                        Potrai disiscriverti in qualsiasi momento. I tuoi dati non saranno condivisi con terzi.
                                    </span>
                                </span>
                            </label>
                        </section>
                    </div>

                    {/* RIGHT - Summary */}
                    <aside className="bg-[#F1EBE1] rounded-2xl p-6 h-fit sticky top-24">
                        <h2 className="font-serif text-2xl">Riepilogo</h2>
                        <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
                            {items.length === 0 ? (
                                <p className="text-sm text-[#515E4C] italic">Nessun piatto nel carrello.</p>
                            ) : items.map((i) => (
                                <div key={i.line_id} className="text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-[#1C231A]">{i.quantity}× {i.name}</span>
                                        <span className="text-[#515E4C]">€ {((i.unit_price ?? i.price) * i.quantity).toFixed(2)}</span>
                                    </div>
                                    {(i.customizations || []).length > 0 && (
                                        <ul className="mt-0.5 ml-2 space-y-0.5">
                                            {i.customizations.map((c, idx) => (
                                                <li key={idx} className="text-[11px] text-[#5C4E3C]">
                                                    <span className="text-[#9B8E7A]">↳ {c.group_name}:</span> {c.option_names.join(", ")}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 pt-4 border-t border-[#2B4A33]/15 text-sm text-[#515E4C] space-y-1">
                            <div className="flex justify-between"><span>Subtotale</span><span>€ {subtotal.toFixed(2)}</span></div>
                            {deliveryFee > 0 && <div className="flex justify-between"><span>Consegna</span><span>€ {deliveryFee.toFixed(2)}</span></div>}
                            <div className="flex justify-between font-serif text-2xl text-[#2B4A33] mt-3" data-testid="checkout-total"><span>Totale</span><span>€ {total.toFixed(2)}</span></div>
                        </div>
                        <button
                            type="submit"
                            data-testid="submit-checkout-btn"
                            disabled={submitting || items.length === 0}
                            className="btn-brand w-full justify-center mt-6 disabled:opacity-60"
                        >
                            {submitting ? "Reindirizzamento..." : <>Paga con Stripe <ArrowRight size={16} /></>}
                        </button>
                        <p className="mt-3 text-xs text-[#8A9486] text-center">Pagamento sicuro · test mode</p>
                    </aside>
                </form>
            </div>
        </div>
    );
};

const Input = ({ id, label, className = "", ...props }) => (
    <div className={className}>
        <label htmlFor={id} className="overline block mb-2">{label}</label>
        <input
            id={id}
            data-testid={`checkout-${id}`}
            {...props}
            className="w-full rounded-xl bg-[#F9F6F0] border border-transparent focus:border-[#2B4A33] focus:ring-1 focus:ring-[#2B4A33] px-4 py-3 text-sm outline-none"
        />
    </div>
);

export default CheckoutPage;
