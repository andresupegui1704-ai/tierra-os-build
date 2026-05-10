import React from "react";
import { motion } from "framer-motion";

/** NumberedSection — "N° 01" / "Issue" style block with massive serif numeral and divider.
 *  Used as section opener throughout the site. */
export const NumberedSection = ({ number, label, title, subtitle, align = "left", children, testId }) => {
    return (
        <section data-testid={testId} className="relative py-20 sm:py-28">
            <div className={`max-w-screen-xl mx-auto px-6 lg:px-12 ${align === "center" ? "text-center" : ""}`}>
                <div className={`flex flex-col gap-6 ${align === "center" ? "items-center" : "items-start"}`}>
                    <motion.div
                        initial={{ opacity: 0, x: align === "center" ? 0 : -12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="flex items-baseline gap-5"
                    >
                        <span className="mag-number text-7xl sm:text-8xl">{number}</span>
                        <span className="overline text-tierra-brand">— {label}</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="h-display text-tierra-ink text-4xl sm:text-5xl lg:text-6xl max-w-3xl"
                    >
                        {title}
                    </motion.h2>

                    {subtitle && (
                        <motion.p
                            initial={{ opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-tierra-ink2 text-base sm:text-lg max-w-2xl leading-relaxed"
                        >
                            {subtitle}
                        </motion.p>
                    )}

                    <div className="w-full mt-6">{children}</div>
                </div>
            </div>
        </section>
    );
};

export default NumberedSection;
