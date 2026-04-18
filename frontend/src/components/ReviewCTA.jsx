import React from "react";
import { Star, ArrowUpRight, Gift } from "lucide-react";
import { BRAND } from "../config/brand";

export const GOOGLE_REVIEW_URL = BRAND.links.googleReview;

const GoogleG = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
);

/**
 * Full card CTA — for pages with dedicated space (Menu bottom, Order success)
 */
export const ReviewCTACard = ({ variant = "light", testId = "review-cta-card" }) => {
    const isDark = variant === "dark";
    return (
        <div
            data-testid={testId}
            className={`relative overflow-hidden rounded-3xl border px-6 py-8 sm:px-12 sm:py-12 ${
                isDark
                    ? "bg-gradient-to-br from-[#2C2418] via-[#3A2F20] to-[#2C2418] border-[#C9A94E]/25 text-[#F5EFE2]"
                    : "bg-gradient-to-br from-[#EADFC9] via-[#F5EFE2] to-[#E4D3A9] border-[#8A5B3D]/15 text-[#2C2418]"
            }`}
        >
            <div className="absolute -top-8 -right-8 opacity-30 rotate-12">
                <Star size={120} strokeWidth={0.8} className="text-[#C9A94E] fill-[#C9A94E]/20" />
            </div>
            <div className="absolute -bottom-10 -left-6 opacity-20 -rotate-12">
                <Star size={90} strokeWidth={0.8} className="text-[#C9A94E] fill-[#C9A94E]/20" />
            </div>

            <div className="relative">
                <div className="flex items-center gap-1 text-[#C9A94E] mb-4">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} size={18} strokeWidth={1.4} className="fill-[#C9A94E]" />
                    ))}
                </div>
                <p className={`overline ${isDark ? "text-[#C9A94E]" : "text-[#8A5B3D]"}`}>Ti è piaciuto?</p>
                <h2 className={`h-display text-2xl sm:text-3xl lg:text-4xl mt-3 leading-tight max-w-2xl ${isDark ? "text-[#F5EFE2]" : "text-[#2C2418]"}`}>
                    Lascia una <span className={`italic ${isDark ? "text-[#D4B66A]" : "text-[#8A5B3D]"}`}>recensione</span> su Google — ti offriamo un dolce pensiero.
                </h2>
                <p className={`mt-5 leading-relaxed max-w-2xl text-sm sm:text-base ${isDark ? "text-[#EADFC9]" : "text-[#5C4E3C]"}`}>
                    Se sei stato bene, diccelo e aiutaci a crescere. Ti regaleremo <strong>uno dei nostri biscotti artigianali</strong> — un piccolo grazie per il tuo tempo.
                </p>

                <div className="mt-7 flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-3 sm:gap-4">
                    <a
                        href={GOOGLE_REVIEW_URL}
                        target="_blank"
                        rel="noreferrer"
                        data-testid={`${testId}-link`}
                        className={`inline-flex items-center justify-center gap-3 rounded-full px-6 py-3.5 text-sm font-medium tracking-wide transition-all hover:scale-[1.02] shadow-[0_8px_24px_-8px_rgba(44,36,24,0.4)] ${
                            isDark
                                ? "bg-[#F5EFE2] hover:bg-white text-[#2C2418]"
                                : "bg-[#2C2418] hover:bg-[#3A2F20] text-[#F5EFE2]"
                        }`}
                    >
                        <GoogleG />
                        Scrivi una recensione
                        <ArrowUpRight size={16} strokeWidth={2} />
                    </a>
                    <span className={`text-xs italic ${isDark ? "text-[#C9A94E]/80" : "text-[#8A7A62]"}`}>
                        Mostraci lo screenshot in cassa · pensiamo noi al biscotto
                    </span>
                </div>
            </div>
        </div>
    );
};

/**
 * Compact banner — horizontal strip for top of menu or tight spots
 */
export const ReviewCTABanner = ({ testId = "review-cta-banner" }) => (
    <a
        href={GOOGLE_REVIEW_URL}
        target="_blank"
        rel="noreferrer"
        data-testid={testId}
        className="group flex items-center gap-3 sm:gap-4 rounded-2xl border border-[#C9A94E]/40 bg-[#FFFDF7] px-4 py-3 sm:px-5 sm:py-4 hover:border-[#C9A94E] hover:shadow-md transition-all"
    >
        <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FCF5E3] flex items-center justify-center">
            <Gift size={18} strokeWidth={1.5} className="text-[#8A5B3D]" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-[#C9A94E] mb-0.5">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} size={11} strokeWidth={1.5} className="fill-[#C9A94E]" />
                ))}
            </div>
            <p className="text-xs sm:text-sm text-[#2C2418] leading-snug">
                <strong>Recensiscici su Google</strong> → ti regaliamo un biscotto artigianale
            </p>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 text-[#2C2418] group-hover:translate-x-0.5 transition-transform">
            <GoogleG size={14} />
            <ArrowUpRight size={14} strokeWidth={2} />
        </div>
    </a>
);
