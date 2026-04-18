import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "tierra_cart_v2";

function lineId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function CartProvider({ children }) {
    const [items, setItems] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [serviceType, setServiceType] = useState("asporto");
    const [open, setOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }, [items]);

    /**
     * addItem(item, { customizations, unitPrice })
     * - customizations: [{group_name, option_names, price_delta}]
     * - unitPrice: base + sum(delta)
     * Identical configurations stack qty; different configs create new lines.
     */
    const addItem = (item, opts = {}) => {
        const customizations = opts.customizations || [];
        const unitPrice = opts.unitPrice ?? item.price;
        const sig = JSON.stringify(customizations);
        setItems((prev) => {
            const existing = prev.find((i) => i.item_id === item.id && JSON.stringify(i.customizations) === sig);
            if (existing) {
                return prev.map((i) => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [
                ...prev,
                {
                    line_id: lineId(),
                    item_id: item.id,
                    name: item.name,
                    price: item.price,
                    unit_price: unitPrice,
                    quantity: 1,
                    image_url: item.image_url,
                    customizations,
                },
            ];
        });
        setOpen(true);
    };

    const updateQty = (line_id, qty) => {
        if (qty <= 0) return setItems((p) => p.filter((i) => i.line_id !== line_id));
        setItems((p) => p.map((i) => i.line_id === line_id ? { ...i, quantity: qty } : i));
    };

    const removeItem = (line_id) => setItems((p) => p.filter((i) => i.line_id !== line_id));
    const clear = () => setItems([]);

    const subtotal = useMemo(
        () => items.reduce((s, i) => s + (i.unit_price ?? i.price) * i.quantity, 0),
        [items]
    );
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
