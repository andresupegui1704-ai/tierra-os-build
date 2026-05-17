"""Tierra OS ↔ Menu Site — Ingredient ID mapping.

Bidirectional mapping between Lark `Ingredienti.ingredient_id` and
customization option names used on the menu site.

⚠️ Naming discrepancies (Tierra OS spec → Menu Site reality):
- Riso Nero      → Riso Venere (site)
- Riso Rosso     → Riso Integrale (site)  [DIFFERENT INGREDIENT — to be aligned]
- Cous Cous      → Couscous di Mais
- Petto di Pollo → NOT on site (closest: Pollo all'Orientale / Pollo al Curry)
- Roast Beef     → NOT on site (only as Roast Beef Plate piatto)
- Tonno Ceviche  → Ceviche di Tonno Rosso
- Salmone Ceviche→ Ceviche di Salmone
- Baccalà Pastrami → Pastrami di Baccalà
- Polpo Buccia di Limone → Polpo con Buccia di Limone
- Gambero Orientale → Gamberoni all'Orientale
- Hummus Ceci    → NOT on site (site uses Rapa Rossa/Zucca/Topinambur/Melanzana)
- Hummus Zucca   → Hummus di Zucca ✓
- Hummus Barbabietola → Hummus di Rapa Rossa
"""

# Map: Lark ingredient_id → site option name (case-sensitive)
INGREDIENT_TO_SITE_NAME: dict[str, str] = {
    # BASI
    "ing_riso_bianco": "Riso Bianco",
    "ing_riso_nero": "Riso Venere",
    "ing_riso_rosso": "Riso Integrale",
    "ing_cous_cous": "Couscous di Mais",
    # CARNE
    "ing_petto_pollo": "Pollo all'Orientale",  # closest match; to align with Raul
    "ing_lemon_meatballs": "Polpetta al Limone",
    "ing_oriental_chicken": "Pollo all'Orientale",
    "ing_curry_chicken": "Pollo al Curry",
    "ing_roast_beef": "Polpetta al Sugo",  # PLACEHOLDER — Roast Beef non in bowl options
    # PESCE
    "ing_tonno_ceviche": "Ceviche di Tonno Rosso",
    "ing_salmone_ceviche": "Ceviche di Salmone",
    "ing_baccala_pastrami": "Pastrami di Baccalà",
    "ing_polpo_buccia_limone": "Polpo con Buccia di Limone",
    "ing_gambero_orientale": "Gamberoni all'Orientale",
    # VEGETALI
    "ing_hummus_ceci": "Hummus di Topinambur",  # PLACEHOLDER — site non ha "Ceci"
    "ing_hummus_zucca": "Hummus di Zucca",
    "ing_hummus_barbabietola": "Hummus di Rapa Rossa",
}

# Reverse map: site option name (lowercase) → ingredient_id
SITE_NAME_TO_INGREDIENT: dict[str, str] = {
    v.lower(): k for k, v in INGREDIENT_TO_SITE_NAME.items()
}
