import React, { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { api, API } from "../lib/api";

const USAGE_HINTS = {
    dish:     { label: "Foto piatto", size: "800 × 800 px · 1:1 quadrato", ratio: "aspect-square" },
    hero:     { label: "Banner / hero", size: "1920 × 1080 px · 16:9 orizzontale", ratio: "aspect-video" },
    interior: { label: "Interno locale", size: "1400 × 900 px · 3:2 orizzontale", ratio: "aspect-[3/2]" },
    team:     { label: "Team / chef", size: "600 × 800 px · 3:4 verticale", ratio: "aspect-[3/4]" },
    free:     { label: "Immagine libera", size: "max 1600 px lato lungo", ratio: "aspect-square" },
};

const ImageUploader = ({ value, onChange, usage = "dish", testid = "image-uploader" }) => {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);
    const hint = USAGE_HINTS[usage] || USAGE_HINTS.free;

    const handleFile = async (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) return toast.error("Seleziona un'immagine");
        if (file.size > 8 * 1024 * 1024) return toast.error("File troppo grande (max 8 MB)");
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("usage", usage);
            const { data } = await api.post("/admin/uploads", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const fullUrl = `${API}/files/${data.id}`;
            onChange(fullUrl);
            toast.success(`Foto caricata · ottimizzata in WebP ${Math.round((data.size || 0) / 1024)} KB`);
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Upload fallito");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div data-testid={testid} className="flex items-start gap-4">
            {value ? (
                <div className={`relative w-32 ${hint.ratio} rounded-xl overflow-hidden border border-[#8A5B3D]/15`}>
                    <img src={value} alt="preview" className="w-full h-full object-cover" />
                    <button
                        type="button"
                        data-testid={`${testid}-clear`}
                        onClick={() => onChange(null)}
                        className="absolute top-1 right-1 bg-white/95 rounded-full p-1 hover:bg-white shadow"
                        title="Rimuovi"
                    ><X size={14} /></button>
                </div>
            ) : (
                <div className={`w-32 ${hint.ratio} rounded-xl border-2 border-dashed border-[#8A5B3D]/30 flex items-center justify-center text-[#9B8E7A]`}>
                    <ImageIcon size={28} strokeWidth={1.3} />
                </div>
            )}
            <div className="flex-1">
                <button
                    type="button"
                    data-testid={`${testid}-btn`}
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="btn-outline-brand disabled:opacity-50"
                >
                    <Upload size={16} /> {uploading ? "Caricamento..." : value ? "Sostituisci" : "Carica foto"}
                </button>
                <p className="text-xs text-[#9B8E7A] mt-2"><strong>{hint.label}:</strong> {hint.size}</p>
                <p className="text-[11px] text-[#9B8E7A]">Conversione automatica in WebP · sRGB · max 8 MB</p>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                />
            </div>
        </div>
    );
};

export default ImageUploader;
