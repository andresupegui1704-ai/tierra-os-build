import React, { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react";
import { api } from "../lib/api";

const OrderSuccessPage = () => {
    const [sp] = useSearchParams();
    const sessionId = sp.get("session_id");
    const orderId = sp.get("order_id");
    const [status, setStatus] = useState("polling"); // polling | paid | failed | expired
    const [order, setOrder] = useState(null);
    const attempts = useRef(0);

    useEffect(() => {
        if (!sessionId) { setStatus("failed"); return; }

        const poll = async () => {
            attempts.current += 1;
            if (attempts.current > 10) return setStatus("expired");
            try {
                const { data } = await api.get(`/payments/status/${sessionId}`);
                if (data.payment_status === "paid") {
                    setStatus("paid");
                    if (orderId) {
                        const { data: o } = await api.get(`/orders/${orderId}`);
                        setOrder(o);
                    }
                    return;
                }
                if (data.status === "expired") return setStatus("expired");
                setTimeout(poll, 2000);
            } catch {
                setTimeout(poll, 2500);
            }
        };
        poll();
    }, [sessionId, orderId]);

    return (
        <div data-testid="order-success-page" className="pt-28 pb-20 min-h-screen bg-[#F9F6F0] flex items-center">
            <div className="max-w-2xl mx-auto px-6 w-full">
                <div className="bg-white rounded-3xl p-10 border border-[#2B4A33]/10 text-center">
                    {status === "polling" && (
                        <>
                            <Clock size={48} strokeWidth={1.3} className="mx-auto text-[#C46D46] animate-pulse" />
                            <h1 className="h-display text-3xl mt-6">Verifica del pagamento...</h1>
                            <p className="mt-3 text-[#515E4C]">Un attimo, stiamo confermando il tuo ordine.</p>
                        </>
                    )}
                    {status === "paid" && (
                        <>
                            <CheckCircle2 size={56} strokeWidth={1.2} className="mx-auto text-[#3C6E47]" />
                            <p className="overline mt-6 text-[#3C6E47]">Ordine confermato</p>
                            <h1 className="h-display text-4xl mt-3">Grazie di aver ordinato <span className="italic text-[#C46D46]">con noi</span></h1>
                            <p className="mt-4 text-[#515E4C]">
                                Ti abbiamo inviato un'email di conferma. Stiamo già preparando tutto con cura.
                            </p>
                            {order && (
                                <div className="mt-8 text-left bg-[#F1EBE1] rounded-xl p-5 text-sm">
                                    <p className="overline">Riepilogo</p>
                                    <p className="mt-2 font-serif text-xl text-[#1C231A]">€ {order.total.toFixed(2)} · {order.service_type}</p>
                                    <ul className="mt-3 space-y-2 text-[#515E4C]">
                                        {order.items.map((i, idx) => {
                                            const unit = i.unit_price ?? i.price;
                                            const total = i.line_total ?? unit * i.quantity;
                                            return (
                                                <li key={idx}>
                                                    <div className="flex justify-between"><span>{i.quantity}× {i.name}</span><span>€ {total.toFixed(2)}</span></div>
                                                    {(i.customizations || []).length > 0 && (
                                                        <ul className="ml-4 mt-1 text-[11px] text-[#5C4E3C] space-y-0.5">
                                                            {i.customizations.map((c, k) => (
                                                                <li key={k}>↳ <em>{c.group_name}:</em> {c.option_names.join(", ")}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                    {(status === "failed" || status === "expired") && (
                        <>
                            <XCircle size={48} strokeWidth={1.3} className="mx-auto text-[#963A3A]" />
                            <h1 className="h-display text-3xl mt-6">Pagamento non completato</h1>
                            <p className="mt-3 text-[#515E4C]">Puoi riprovare o contattarci direttamente su WhatsApp.</p>
                        </>
                    )}
                    <div className="mt-8 flex justify-center gap-3 flex-wrap">
                        <Link data-testid="back-to-menu" to="/menu" className="btn-outline-brand">Torna al menù</Link>
                        <Link data-testid="back-to-home" to="/" className="btn-brand">Home <ArrowRight size={16} /></Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccessPage;
