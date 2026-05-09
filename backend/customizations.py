"""Customization templates — riflettono i 4 menu cartacei Tierra v2 (Apr 2026)."""
from typing import List, Dict

CUSTOMIZATION_VERSION = 5  # v5: schema "Create Your Bowl" allineato chalkboard LUNCH

CARBS: List[Dict] = [
    {"name": "Riso Bianco", "price_delta": 0.0},
    {"name": "Riso Integrale", "price_delta": 0.0},
    {"name": "Riso Venere", "price_delta": 0.0},
    {"name": "Couscous di Mais", "price_delta": 0.0},
]

MEAT_PROTEINS: List[Dict] = [
    {"name": "Lemon Meatballs", "price_delta": 2.00, "description": "Polpette al limone"},
    {"name": "Oriental Chicken", "price_delta": 2.00, "description": "Pollo stile orientale"},
    {"name": "Curry Chicken", "price_delta": 2.00, "description": "Pollo al curry"},
]

SEAFOOD_PROTEINS: List[Dict] = [
    {"name": "Salmon Ceviche", "price_delta": 3.00, "description": "*Pesce abbattuto e marinato"},
    {"name": "Tuna Tataki", "price_delta": 3.00, "description": "Tonno scottato"},
    {"name": "Baccalà", "price_delta": 3.00},
    {"name": "Oriental Octopus", "price_delta": 3.00, "description": "Polpo stile orientale"},
    {"name": "Red Shrimp", "price_delta": 3.00, "description": "Gamberi rossi"},
]

VEGAN_PROTEINS: List[Dict] = [
    {"name": "Chickpea Hummus", "price_delta": 2.00, "description": "Hummus di ceci"},
    {"name": "Pumpkin Hummus", "price_delta": 2.00, "description": "Hummus di zucca"},
    {"name": "Beet Hummus", "price_delta": 2.00, "description": "Hummus di barbabietola"},
]

ALL_PROTEINS = MEAT_PROTEINS + SEAFOOD_PROTEINS + VEGAN_PROTEINS

EXTRAS: List[Dict] = [
    {"name": "Avocado", "price_delta": 3.00},
    {"name": "Extra Protein", "price_delta": 3.00, "description": "Una proteina extra a scelta"},
]


def bowl_groups() -> List[Dict]:
    return [
        {"name": "Base", "description": "Scegli la base di carboidrati (inclusa)",
         "selection_type": "single", "min_select": 1, "max_select": 1, "required": True,
         "options": list(CARBS)},
        {"name": "Proteina", "description": "Meat +€2 · Seafood +€3 · Vegan +€2",
         "selection_type": "single", "min_select": 1, "max_select": 1, "required": True,
         "options": list(ALL_PROTEINS)},
        {"name": "Add More", "description": "Avocado +€3 · Extra protein +€3",
         "selection_type": "multiple", "min_select": 0, "max_select": 4, "required": False,
         "options": list(EXTRAS)},
    ]


def _proteins_free() -> List[Dict]:
    return [{**p, "price_delta": 0.0} for p in ALL_PROTEINS]


def secondo_groups() -> List[Dict]:
    """Gruppi per Tierra Plate — 2 proteine incluse, ulteriori a prezzo pieno."""
    return [
        {"name": "Proteine incluse (scegli 2)", "description": "Due proteine a scelta, incluse",
         "selection_type": "multiple", "min_select": 2, "max_select": 2, "required": True,
         "options": _proteins_free()},
        {"name": "Proteina extra", "description": "Meat/Veg +€2 · Seafood +€3",
         "selection_type": "multiple", "min_select": 0, "max_select": 3, "required": False,
         "options": list(ALL_PROTEINS)},
        {"name": "Extra", "description": "Avocado, extra protein",
         "selection_type": "multiple", "min_select": 0, "max_select": 4, "required": False,
         "options": list(EXTRAS)},
    ]
