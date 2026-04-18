import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import { CartProvider } from "./context/CartContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import WhatsAppFab from "./components/WhatsAppFab";

import Landing from "./pages/Landing";
import MenuPage from "./pages/MenuPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import ReservationsPage from "./pages/ReservationsPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

const Chrome = ({ children }) => {
    const { pathname } = useLocation();
    const isAdmin = pathname.startsWith("/admin");
    return (
        <>
            {!isAdmin && <Header />}
            {children}
            {!isAdmin && <Footer />}
            {!isAdmin && <CartDrawer />}
            {!isAdmin && <WhatsAppFab />}
        </>
    );
};

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <CartProvider>
                    <Toaster position="top-right" richColors />
                    <Chrome>
                        <Routes>
                            <Route path="/" element={<Landing />} />
                            <Route path="/menu" element={<MenuPage />} />
                            <Route path="/prenota" element={<ReservationsPage />} />
                            <Route path="/checkout" element={<CheckoutPage />} />
                            <Route path="/ordine/successo" element={<OrderSuccessPage />} />
                            <Route path="/admin" element={<AdminLogin />} />
                            <Route path="/admin/dashboard" element={<AdminDashboard />} />
                        </Routes>
                    </Chrome>
                </CartProvider>
            </BrowserRouter>
        </div>
    );
}

export default App;
