import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "tierra_cart_v1";

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [serviceType, setServiceType] = useState("asporto"); // delivery | asporto | preordine
    const [open, setOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }, [items]);

    const addItem = (item) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.item_id === item.id);
            if (existing) {
                return prev.map((i) => i.item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { item_id: item.id, name: item.name, price: item.price, quantity: 1, image_url: item.image_url }];
        });
        setOpen(true);
    };

    const updateQty = (item_id, qty) => {
        if (qty <= 0) return setItems((p) => p.filter((i) => i.item_id !== item_id));
        setItems((p) => p.map((i) => i.item_id === item_id ? { ...i, quantity: qty } : i));
    };

    const removeItem = (item_id) => setItems((p) => p.filter((i) => i.item_id !== item_id));
    const clear = () => setItems([]);

    const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items]);
    const deliveryFee = serviceType === "delivery" ? 3.5 : 0;
    const total = subtotal + deliveryFee;
    const count = items.reduce((s, i) => s + i.quantity, 0);

    return (
        <CartContext.Provider value={{
            items, addItem, updateQty, removeItem, clear,
            serviceType, setServiceType,
            subtotal, deliveryFee, total, count,
            open, setOpen,
        }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be inside CartProvider");
    return ctx;
};
