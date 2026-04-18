import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { api } from "../lib/api";

const AdminLogin = () => {
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const nav = useNavigate();

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post("/admin/login", form);
            localStorage.setItem("tierra_admin_token", data.access_token);
            toast.success("Benvenuto!");
            nav("/admin/dashboard");
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Credenziali non valide");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div data-testid="admin-login-page" className="min-h-screen bg-[#F4F5F2] flex items-center justify-center px-6">
            <form onSubmit={submit} className="w-full max-w-md bg-white rounded-3xl p-10 border border-[#2B4A33]/10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2B4A33] flex items-center justify-center"><Lock size={18} className="text-[#F9F6F0]" /></div>
                    <div>
                        <p className="overline">Area gestore</p>
                        <h1 className="font-serif italic text-3xl">Tierra</h1>
                    </div>
                </div>
                <div className="mt-8 space-y-4">
                    <div>
                        <label className="overline block mb-2">Email</label>
                        <input data-testid="admin-email-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl bg-[#F9F6F0] px-4 py-3 outline-none focus:ring-1 focus:ring-[#2B4A33]" />
                    </div>
                    <div>
                        <label className="overline block mb-2">Password</label>
                        <input data-testid="admin-password-input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl bg-[#F9F6F0] px-4 py-3 outline-none focus:ring-1 focus:ring-[#2B4A33]" />
                    </div>
                    <button data-testid="admin-login-submit" disabled={loading} className="btn-brand w-full justify-center disabled:opacity-60">
                        {loading ? "Accesso..." : "Accedi"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminLogin;
