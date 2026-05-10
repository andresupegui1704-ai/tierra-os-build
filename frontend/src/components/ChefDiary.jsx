import React from "react";
import { motion } from "framer-motion";

/** ChefDiary — magazine-style "from the chef's notebook" block.
 *  Left: image / watercolor.
 *  Right: large italic pull-quote, paragraph, signature.
 */
const ChefDiary = () => {
    return (
        <section className="bg-tierra-bgAlt py-24 sm:py-32 relative">
            <div className="max-w-screen-xl mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16 items-start">
                {/* LEFT — illustration */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="md:col-span-5 relative"
                >
                    <div className="relative aspect-[4/5] bg-tierra-paper overflow-hidden">
                        <img
                            src="https://customer-assets.emergentagent.com/job_tierra-bistro-menu/artifacts/c2kut0wr_raulandres17_Medium_vegetarian_bowl_with_rice_seasonal_vegeta_92864348-652d-4ece-a95f-cb70147a81be_3.png"
                            alt="Bowl con verdure di stagione"
                            className="absolute inset-0 w-full h-full object-contain p-4 float-y"
                        />
                    </div>
                    <span aria-hidden className="absolute -bottom-4 -left-4 mag-number text-7xl opacity-15 select-none">02</span>
                </motion.div>

                {/* RIGHT — copy */}
                <div className="md:col-span-7 md:pt-8">
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="flex items-center gap-4 mb-8"
                    >
                        <span className="mag-number text-5xl">02</span>
                        <span className="h-px w-20 bg-tierra-ink/30" />
                        <span className="overline">Dal taccuino dello chef</span>
                    </motion.div>

                    <motion.blockquote
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="h-display italic text-4xl sm:text-5xl text-tierra-ink leading-[1.05]"
                    >
                        “Ogni piatto inizia<br/>la mattina presto,<br/>
                        <span className="not-italic text-tierra-brand">al mercato.”</span>
                    </motion.blockquote>

                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mt-10 text-tierra-ink2 text-base sm:text-lg leading-relaxed max-w-xl"
                    >
                        Scegliamo gli ingredienti dai piccoli produttori del Lazio, lavoriamo
                        con farine biologiche e cuciniamo a vista. Le nostre bowls cambiano
                        ogni settimana per seguire le stagioni — perché un piatto, prima di
                        essere un piatto, è una decisione.
                    </motion.p>

                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="mt-10 font-display italic text-2xl text-tierra-brand"
                    >
                        — Chef Tierra
                    </motion.p>
                </div>
            </div>
        </section>
    );
};

export default ChefDiary;
