import React from "react";
import { useNavigate } from "react-router-dom";
import { X, Minus, Plus, Trash2, Truck, ShoppingBag, Utensils } from "lucide-react";
import { useCart } from "../context/CartContext";

const ServiceButton = ({ active, onClick, icon: Icon, label, id }) => (
    <button
        data-testid={`service-${id}`}
        onClick={onClick}
        className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-md transition-all text-xs font-medium ${
            active ? "bg-white text-[#2B4A33] shadow-sm" : "text-[#515E4C] hover:text-[#1C231A]"
        }`}
    >
        <Icon size={18} strokeWidth={1.6} />
        <span>{label}</span>
    </button>
);

const CartDrawer = () => {
    const { items, open, setOpen, updateQty, removeItem, serviceType, setServiceType, subtotal, deliveryFee, total } = useCart();
    const navigate = useNavigate();

    if (!open) return null;

    const goCheckout = () => {
        setOpen(false);
        navigate("/checkout");
    };

    return (
        <div data-testid="cart-drawer" className="fixed inset-0 z-[60] flex">
            <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
            <aside className="w-full max-w-md bg-[#F9F6F0] h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#2B4A33]/10">
                    <div>
                        <p className="overline">Il tuo ordine</p>
                        <h2 className="font-serif text-2xl mt-1">Carrello</h2>
                    </div>
                    <button data-testid="close-cart-btn" onClick={() => setOpen(false)} className="p-2 hover:bg-[#F1EBE1] rounded-full"><X size={20} /></button>
                </div>

                <div className="px-6 pt-5">
                    <div className="grid grid-cols-3 gap-2 p-1 bg-[#F1EBE1] rounded-lg">
                        <ServiceButton id="delivery" active={serviceType === "delivery"} onClick={() => setServiceType("delivery")} icon={Truck} label="Delivery" />
                        <ServiceButton id="asporto" active={serviceType === "asporto"} onClick={() => setServiceType("asporto")} icon={ShoppingBag} label="Asporto" />
                        <ServiceButton id="preordine" active={serviceType === "preordine"} onClick={() => setServiceType("preordine")} icon={Utensils} label="Preordine" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {items.length === 0 ? (
                        <div data-testid="cart-empty" className="text-center py-16">
                            <p className="font-serif italic text-2xl text-[#515E4C]">Il tuo carrello è vuoto</p>
                            <p className="text-sm text-[#8A9486] mt-2">Esplora il menù e aggiungi i piatti che preferisci.</p>
                        </div>
                    ) : items.map((i) => (
                        <div key={i.item_id} data-testid={`cart-item-${i.item_id}`} className="flex gap-4 items-start bg-white rounded-xl p-3 border border-[#2B4A33]/5">
                            {i.image_url && <img src={i.image_url} alt={i.name} className="w-16 h-16 rounded-lg object-cover" />}
                            <div className="flex-1">
                                <div className="flex justify-between gap-3">
                                    <h4 className="font-medium text-sm text-[#1C231A]">{i.name}</h4>
                                    <button data-testid={`remove-${i.item_id}`} onClick={() => removeItem(i.item_id)} className="text-[#8A9486] hover:text-[#963A3A]"><Trash2 size={14} /></button>
                                </div>
                                <p className="text-xs text-[#515E4C] mt-1">€ {i.price.toFixed(2)}</p>
                                <div className="mt-2 flex items-center gap-3">
                                    <button data-testid={`dec-${i.item_id}`} onClick={() => updateQty(i.item_id, i.quantity - 1)} className="w-7 h-7 rounded-full border border-[#2B4A33]/20 hover:bg-[#F1EBE1] flex items-center justify-center"><Minus size={12} /></button>
                                    <span className="w-6 text-center text-sm font-medium">{i.quantity}</span>
                                    <button data-testid={`inc-${i.item_id}`} onClick={() => updateQty(i.item_id, i.quantity + 1)} className="w-7 h-7 rounded-full border border-[#2B4A33]/20 hover:bg-[#F1EBE1] flex items-center justify-center"><Plus size={12} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {items.length > 0 && (
                    <div className="border-t border-[#2B4A33]/10 px-6 py-5 bg-white">
                        <div className="flex justify-between text-sm text-[#515E4C]"><span>Subtotale</span><span>€ {subtotal.toFixed(2)}</span></div>
                        {deliveryFee > 0 && <div className="flex justify-between text-sm text-[#515E4C] mt-1"><span>Consegna</span><span>€ {deliveryFee.toFixed(2)}</span></div>}
                        <div className="flex justify-between mt-3 font-serif text-2xl text-[#2B4A33]" data-testid="cart-total"><span>Totale</span><span>€ {total.toFixed(2)}</span></div>
                        <button data-testid="cart-checkout-btn" onClick={goCheckout} className="mt-5 btn-brand w-full justify-center">
                            Vai al pagamento
                        </button>
                    </div>
                )}
            </aside>
        </div>
    );
};

export default CartDrawer;
