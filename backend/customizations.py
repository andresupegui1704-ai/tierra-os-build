"""Customization templates — riflettono il menu cartaceo Tierra.

Categorie utilizzate:
- Carboidrati (base)
- Proteine (incluse nella bowl)
- Extra (avocado, hummus, focaccia)
"""
from typing import List, Dict

# Basi di carboidrati - tutte incluse nel prezzo
CARBS: List[Dict] = [
    {"name": "Riso Bianco", "price_delta": 0.0},
    {"name": "Riso Integrale", "price_delta": 0.0},
    {"name": "Riso Venere", "price_delta": 0.0},
    {"name": "Couscous di Mais", "price_delta": 0.0},
]

# Proteine - incluse (0 delta) sia in bowl che in secondo
PROTEINS: List[Dict] = [
    # Pastrami (cotto con spezie, soia, sesamo e salsa teriyaki)
    {"name": "Pastrami di Salmone", "price_delta": 0.0, "description": "Cotto con spezie, soia, sesamo e salsa teriyaki"},
    {"name": "Pastrami di Baccalà", "price_delta": 0.0, "description": "Cotto con spezie, soia, sesamo e salsa teriyaki"},
    {"name": "Pastrami di Tonno", "price_delta": 0.0, "description": "Cotto con spezie, soia, sesamo e salsa teriyaki"},
    {"name": "Polpo con buccia di limone", "price_delta": 0.0},
    # Ceviche (*Pesce abbattuto a bordo e marinato)
    {"name": "Ceviche di Salmone*", "price_delta": 0.0, "description": "*Pesce abbattuto a bordo e marinato"},
    {"name": "Ceviche di Baccalà*", "price_delta": 0.0, "description": "*Pesce abbattuto a bordo e marinato"},
    {"name": "Ceviche di Tonno*", "price_delta": 0.0, "description": "*Pesce abbattuto a bordo e marinato"},
    {"name": "Gamberi stile Orientale*", "price_delta": 0.0, "description": "*Pesce abbattuto a bordo e marinato"},
    # Carne
    {"name": "Pollo stile Orientale / Curry", "price_delta": 0.0},
    {"name": "Polpette in salsa di Limone", "price_delta": 0.0},
    {"name": "Polpette in salsa di Pomodoro", "price_delta": 0.0},
    # Vegetariani
    {"name": "Hummus", "price_delta": 0.0, "description": "Vegetariano"},
    {"name": "Topinambur", "price_delta": 0.0, "description": "Vegetariano"},
    {"name": "Zucca", "price_delta": 0.0, "description": "Vegetariano"},
]

# Extra - con prezzo
EXTRAS: List[Dict] = [
    {"name": "Proteina Extra", "price_delta": 3.00, "description": "Aggiungi una seconda proteina a scelta"},
    {"name": "Avocado", "price_delta": 2.00},
    {"name": "Hummus", "price_delta": 2.00},
    {"name": "Mezza Focaccia", "price_delta": 2.50, "description": "Rosmarino e olio d'oliva"},
    {"name": "Focaccia Intera", "price_delta": 4.00, "description": "Rosmarino e olio d'oliva"},
]


def bowl_groups() -> List[Dict]:
    """Gruppi di personalizzazione per Poke Bio Bowl (Media/Grande)."""
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
            "description": "Scegli una proteina (inclusa nel prezzo)",
            "selection_type": "single",
            "min_select": 1, "max_select": 1, "required": True,
            "options": list(PROTEINS),
        },
        {
            "name": "Extra (opzionali)",
            "description": "Aggiungi extra alla tua bowl",
            "selection_type": "multiple",
            "min_select": 0, "max_select": 5, "required": False,
            "options": list(EXTRAS),
        },
    ]


def secondo_groups() -> List[Dict]:
    """Gruppi di personalizzazione per Secondo con contorno (2 proteine incluse)."""
    return [
        {
            "name": "Proteine (2 incluse)",
            "description": "Seleziona 2 proteine (incluse nel prezzo)",
            "selection_type": "multiple",
            "min_select": 2, "max_select": 2, "required": True,
            "options": list(PROTEINS),
        },
        {
            "name": "Extra (opzionali)",
            "description": "Aggiungi extra al tuo piatto",
            "selection_type": "multiple",
            "min_select": 0, "max_select": 5, "required": False,
            "options": list(EXTRAS),
        },
    ]
