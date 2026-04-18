"""Customization templates — riflettono il menu cartaceo Tierra.

Versioning: la costante CUSTOMIZATION_VERSION viene salvata con i gruppi.
Se lo schema cambia, bump la versione e i gruppi verranno re-applicati
al prossimo startup (eventuali edit admin degli item affetti andranno persi).
"""
from typing import List, Dict

CUSTOMIZATION_VERSION = 4  # v4: opzioni con campo `available`

# Basi di carboidrati — incluse nel prezzo della bowl
CARBS: List[Dict] = [
    {"name": "Riso Bianco", "price_delta": 0.0},
    {"name": "Riso Integrale", "price_delta": 0.0},
    {"name": "Riso Venere", "price_delta": 0.0},
    {"name": "Couscous di Mais", "price_delta": 0.0},
]

# Proteine — ognuna con il proprio prezzo (pesce €3, carne/veg €2)
PROTEINS: List[Dict] = [
    # Pastrami (cotto con spezie, soia, sesamo e salsa teriyaki) — pesce €3
    {"name": "Pastrami di Salmone", "price_delta": 3.00, "description": "Cotto con spezie, soia, sesamo e salsa teriyaki"},
    {"name": "Pastrami di Baccalà", "price_delta": 3.00, "description": "Cotto con spezie, soia, sesamo e salsa teriyaki"},
    {"name": "Pastrami di Tonno", "price_delta": 3.00, "description": "Cotto con spezie, soia, sesamo e salsa teriyaki"},
    {"name": "Polpo con buccia di limone", "price_delta": 3.00},
    # Ceviche (*Pesce abbattuto a bordo e marinato) — €3
    {"name": "Ceviche di Salmone*", "price_delta": 3.00, "description": "*Pesce abbattuto a bordo e marinato"},
    {"name": "Ceviche di Baccalà*", "price_delta": 3.00, "description": "*Pesce abbattuto a bordo e marinato"},
    {"name": "Ceviche di Tonno*", "price_delta": 3.00, "description": "*Pesce abbattuto a bordo e marinato"},
    {"name": "Gamberi stile Orientale*", "price_delta": 3.00, "description": "*Pesce abbattuto a bordo e marinato"},
    # Carne — €2
    {"name": "Pollo stile Orientale / Curry", "price_delta": 2.00},
    {"name": "Polpette in salsa di Limone", "price_delta": 2.00},
    {"name": "Polpette in salsa di Pomodoro", "price_delta": 2.00},
    # Vegetariani — €2
    {"name": "Hummus", "price_delta": 2.00, "description": "Vegetariano"},
    {"name": "Topinambur", "price_delta": 2.00, "description": "Vegetariano"},
    {"name": "Zucca", "price_delta": 2.00, "description": "Vegetariano"},
]

# Extra di contorno (Proteina Extra è ora il gruppo "Proteina extra" che riusa PROTEINS)
EXTRAS: List[Dict] = [
    {"name": "Avocado", "price_delta": 2.00},
    {"name": "Mezza Focaccia", "price_delta": 2.50, "description": "Rosmarino e olio d'oliva"},
    {"name": "Focaccia Intera", "price_delta": 4.00, "description": "Rosmarino e olio d'oliva"},
]


def bowl_groups() -> List[Dict]:
    """Gruppi per Poke Bio Bowl (Media/Grande)."""
    return [
        {
            "name": "Base di carboidrati",
            "description": "Scegli una base (inclusa)",
            "selection_type": "single",
            "min_select": 1, "max_select": 1, "required": True,
            "options": list(CARBS),
        },
        {
            "name": "Proteina",
            "description": "Scegli una proteina",
            "selection_type": "single",
            "min_select": 1, "max_select": 1, "required": True,
            "options": list(PROTEINS),
        },
        {
            "name": "Proteina extra",
            "description": "Vuoi aggiungere una seconda proteina?",
            "selection_type": "multiple",
            "min_select": 0, "max_select": 3, "required": False,
            "options": list(PROTEINS),
        },
        {
            "name": "Extra",
            "description": "Avocado, focaccia",
            "selection_type": "multiple",
            "min_select": 0, "max_select": 4, "required": False,
            "options": list(EXTRAS),
        },
    ]


def _proteins_free() -> List[Dict]:
    """Stessa paletta di proteine ma con price_delta=0 (incluse)."""
    return [{**p, "price_delta": 0.0} for p in PROTEINS]


def secondo_groups() -> List[Dict]:
    """Gruppi per Secondo con Contorno — 2 proteine incluse, ulteriori a prezzo pieno."""
    return [
        {
            "name": "Proteine incluse (scegli 2)",
            "description": "Due proteine a scelta, incluse nel prezzo",
            "selection_type": "multiple",
            "min_select": 2, "max_select": 2, "required": True,
            "options": _proteins_free(),
        },
        {
            "name": "Proteina extra",
            "description": "Vuoi aggiungere altre proteine? Pesce +€3 · Carne/Veg +€2",
            "selection_type": "multiple",
            "min_select": 0, "max_select": 3, "required": False,
            "options": list(PROTEINS),
        },
        {
            "name": "Extra",
            "description": "Avocado, focaccia",
            "selection_type": "multiple",
            "min_select": 0, "max_select": 4, "required": False,
            "options": list(EXTRAS),
        },
    ]
