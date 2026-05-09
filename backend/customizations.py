"""Customization templates — Tierra v3 (May 2026).

Proteine + extra aggiornati su richiesta utente:
- CARNE €2: Polpetta al limone / al sugo · Pollo al curry / all'orientale
- PESCE €3: Ceviche pesce bianco / tonno rosso / salmone · Pastrami baccalà / tonno / salmone
            · Gamberoni all'orientale · Polpo con buccia di limone
- HUMMUS DEL GIORNO €2: Rapa rossa · Zucca · Topinambur · Melanzana arrostita

Tutte le opzioni hanno `available: True` di default. Possono essere disattivate
globalmente da Tierra OS via PATCH /api/tierra/options/availability.
"""
from typing import List, Dict

CUSTOMIZATION_VERSION = 6  # v6: nuove proteine + extras (May 2026)

# Basi di carboidrati — incluse nel prezzo della bowl
CARBS: List[Dict] = [
    {"name": "Riso Bianco", "price_delta": 0.0, "available": True},
    {"name": "Riso Integrale", "price_delta": 0.0, "available": True},
    {"name": "Riso Venere", "price_delta": 0.0, "available": True},
    {"name": "Couscous di Mais", "price_delta": 0.0, "available": True},
]

# CARNE — €2
MEAT_PROTEINS: List[Dict] = [
    {"name": "Polpetta al Limone", "price_delta": 2.00, "available": True, "tag": "carne"},
    {"name": "Polpetta al Sugo", "price_delta": 2.00, "available": True, "tag": "carne"},
    {"name": "Pollo al Curry", "price_delta": 2.00, "available": True, "tag": "carne"},
    {"name": "Pollo all'Orientale", "price_delta": 2.00, "available": True, "tag": "carne"},
]

# PESCE — €3
SEAFOOD_PROTEINS: List[Dict] = [
    {"name": "Ceviche di Pesce Bianco", "price_delta": 3.00, "available": True, "tag": "pesce",
     "description": "*Pesce abbattuto e marinato"},
    {"name": "Ceviche di Tonno Rosso", "price_delta": 3.00, "available": True, "tag": "pesce",
     "description": "*Pesce abbattuto e marinato"},
    {"name": "Ceviche di Salmone", "price_delta": 3.00, "available": True, "tag": "pesce",
     "description": "*Pesce abbattuto e marinato"},
    {"name": "Pastrami di Baccalà", "price_delta": 3.00, "available": True, "tag": "pesce",
     "description": "Spezie, soia, sesamo, salsa teriyaki"},
    {"name": "Pastrami di Tonno", "price_delta": 3.00, "available": True, "tag": "pesce",
     "description": "Spezie, soia, sesamo, salsa teriyaki"},
    {"name": "Pastrami di Salmone", "price_delta": 3.00, "available": True, "tag": "pesce",
     "description": "Spezie, soia, sesamo, salsa teriyaki"},
    {"name": "Gamberoni all'Orientale", "price_delta": 3.00, "available": True, "tag": "pesce"},
    {"name": "Polpo con Buccia di Limone", "price_delta": 3.00, "available": True, "tag": "pesce"},
]

# HUMMUS DEL GIORNO — €2
VEGAN_PROTEINS: List[Dict] = [
    {"name": "Hummus di Rapa Rossa", "price_delta": 2.00, "available": True, "tag": "vegan"},
    {"name": "Hummus di Zucca", "price_delta": 2.00, "available": True, "tag": "vegan"},
    {"name": "Hummus di Topinambur", "price_delta": 2.00, "available": True, "tag": "vegan"},
    {"name": "Hummus di Melanzana Arrostita", "price_delta": 2.00, "available": True, "tag": "vegan"},
]

ALL_PROTEINS = MEAT_PROTEINS + SEAFOOD_PROTEINS + VEGAN_PROTEINS

# EXTRA — prezzi aggiornati
EXTRAS: List[Dict] = [
    {"name": "Avocado", "price_delta": 3.00, "available": True},
    {"name": "Mezza Focaccia", "price_delta": 3.00, "available": True,
     "description": "Rosmarino e olio EVO"},
    {"name": "Focaccia Intera", "price_delta": 5.00, "available": True,
     "description": "Rosmarino e olio EVO"},
]


def bowl_groups() -> List[Dict]:
    """Gruppi per Medium / Large Bowl — schema chalkboard 'Create Your Bowl'."""
    return [
        {"name": "Base", "description": "Scegli la base di carboidrati (inclusa)",
         "selection_type": "single", "min_select": 1, "max_select": 1, "required": True,
         "options": list(CARBS)},
        {"name": "Proteina", "description": "Carne +€2 · Pesce +€3 · Hummus del giorno +€2",
         "selection_type": "single", "min_select": 1, "max_select": 1, "required": True,
         "options": list(ALL_PROTEINS)},
        {"name": "Aggiungi", "description": "Avocado · Focaccia",
         "selection_type": "multiple", "min_select": 0, "max_select": 4, "required": False,
         "options": list(EXTRAS)},
    ]


def _proteins_free() -> List[Dict]:
    """Le stesse proteine ma con price_delta=0 (incluse nel Tierra Plate)."""
    return [{**p, "price_delta": 0.0} for p in ALL_PROTEINS]


def secondo_groups() -> List[Dict]:
    """Gruppi per Tierra Plate — 2 proteine incluse, ulteriori a prezzo pieno."""
    return [
        {"name": "Proteine incluse (scegli 2)", "description": "Due proteine a scelta, incluse",
         "selection_type": "multiple", "min_select": 2, "max_select": 2, "required": True,
         "options": _proteins_free()},
        {"name": "Proteina extra", "description": "Carne/Vegan +€2 · Pesce +€3",
         "selection_type": "multiple", "min_select": 0, "max_select": 3, "required": False,
         "options": list(ALL_PROTEINS)},
        {"name": "Aggiungi", "description": "Avocado · Focaccia",
         "selection_type": "multiple", "min_select": 0, "max_select": 4, "required": False,
         "options": list(EXTRAS)},
    ]
