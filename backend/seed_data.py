"""Tierra Organic Bistro — Menu Seed Data v2 (29 Apr 2026)
Sourced from the 4 official chalkboard menus:
- BREAKFAST chalkboard
- LUNCH (Create Your Bowl) blackboard
- COFFEE & DRINKS blackboard
- DRINKS · WINES · BITES blackboard

Categories restructured to match the physical menu boards.
"""

CATEGORIES = [
    {
        "slug": "colazione",
        "name": "Colazione",
        "description": "Toast, uova, pasticceria artigianale e dolci da forno preparati ogni mattina con farine biologiche.",
        "image_url": "https://images.unsplash.com/photo-1638720772346-b745bcd72f5f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "order": 1,
    },
    {
        "slug": "bowls",
        "name": "Bowls & Lunch",
        "description": "Crea la tua bowl con riso e verdure di stagione, scegli proteine e topping. Tierra Plate per chi ama variare.",
        "image_url": "https://images.unsplash.com/photo-1759922222212-3657d43bd5b5?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "order": 2,
    },
    {
        "slug": "piatti-del-giorno",
        "name": "Piatti del Giorno",
        "description": "Le proposte del nostro chef: piatti freschi pensati ogni giorno con materie prime di stagione.",
        "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "order": 3,
    },
    {
        "slug": "aperitierra",
        "name": "Aperitierra",
        "description": "Cocktail d'autore, vini selezionati, birre artigianali e bites curati. Tutti i giorni dalle 18:00 alle 20:00.",
        "image_url": "https://images.unsplash.com/photo-1559847844-5315695dadae?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "order": 4,
    },
    {
        "slug": "caffetteria",
        "name": "Caffetteria & Drinks",
        "description": "Caffè, cappuccino con latti vegetali, succhi signature freschi a freddo, bibite biologiche e birre artigianali.",
        "image_url": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "order": 5,
    },
]


# Helper for reuse — placeholder image (admin/OS will replace)
PH = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"


ITEMS = [
    # ═══════════════════════════════════════════════════════════════
    #  COLAZIONE — BREAKFAST chalkboard
    # ═══════════════════════════════════════════════════════════════
    # ── TOAST
    {"category_slug": "colazione", "name": "Avocado Toast",
     "description": "Pane bio integrale al miso, avocado fresco, uovo strapazzato o all'occhio di bue.",
     "price": 15.00, "image_url": "https://images.unsplash.com/photo-1638720772346-b745bcd72f5f?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
     "badge": "Signature", "order": 1, "tags": ["G", "L", "E"]},

    {"category_slug": "colazione", "name": "Avocado Toast con Tartare",
     "description": "Pane bio integrale, avocado fresco, tartare di tonno o salmone abbattuto.",
     "price": 18.00, "image_url": PH, "badge": None, "order": 2, "tags": ["G", "F"]},

    # ── EGGS
    {"category_slug": "colazione", "name": "Eggs & Bacon",
     "description": "Uova free-range, bacon croccante, sciroppo d'acero.",
     "price": 15.00, "image_url": PH, "badge": None, "order": 3, "tags": ["E"]},

    # ── SWEET
    {"category_slug": "colazione", "name": "French Toast",
     "description": "Brioche, fragole, panna montata, dulce de leche.",
     "price": 10.00, "image_url": PH, "badge": "Sweet", "order": 4, "tags": ["G", "L", "E"]},

    # ── BAKERY
    {"category_slug": "colazione", "name": "Vegan Croissant",
     "description": "Semi di canapa e melograno.",
     "price": 3.50, "image_url": PH, "badge": "Vegan", "order": 5, "tags": ["G"]},

    {"category_slug": "colazione", "name": "Cornetto Classico",
     "description": "Cornetto al burro, ricetta artigianale.",
     "price": 1.70, "image_url": PH, "badge": None, "order": 6, "tags": ["G", "L", "E"]},

    {"category_slug": "colazione", "name": "Cornetto Integrale",
     "description": "Cornetto integrale, farina bio.",
     "price": 1.50, "image_url": PH, "badge": None, "order": 7, "tags": ["G"]},

    {"category_slug": "colazione", "name": "Treccia di Pecan",
     "description": "Pasta sfoglia con noci pecan caramellate.",
     "price": 1.80, "image_url": PH, "badge": None, "order": 8, "tags": ["G", "N"]},

    {"category_slug": "colazione", "name": "Cornetto al Cioccolato",
     "description": "Cornetto sfogliato ripieno di crema di cioccolato fondente.",
     "price": 2.00, "image_url": PH, "badge": None, "order": 9, "tags": ["G", "L", "E"]},

    {"category_slug": "colazione", "name": "Cornetto Farcito",
     "description": "Marmellata bio o crema di nocciole, a scelta.",
     "price": 3.30, "image_url": PH, "badge": None, "order": 10, "tags": ["G", "L", "E", "N"]},

    {"category_slug": "colazione", "name": "Cornetto Crema al Limone",
     "description": "Crema al limone fresca, in pasta sfoglia.",
     "price": 3.00, "image_url": PH, "badge": None, "order": 11, "tags": ["G", "L", "E"]},

    {"category_slug": "colazione", "name": "Mini Cornetto",
     "description": "Versione mini per assaggiare di tutto un po'.",
     "price": 1.60, "image_url": PH, "badge": None, "order": 12, "tags": ["G", "L", "E"]},

    # ── SANDWICH
    {"category_slug": "colazione", "name": "Sandwich Prosciutto & Formaggio",
     "description": "Pane fresco, prosciutto cotto, formaggio.",
     "price": 5.00, "image_url": PH, "badge": None, "order": 13, "tags": ["G", "L"]},

    {"category_slug": "colazione", "name": "Brioche Sandwich",
     "description": "Vegetariano (verdure e hummus), prosciutto di montagna e provolone, oppure tonno, datterini e senape.",
     "price": 7.50, "image_url": PH, "badge": None, "order": 14, "tags": ["G", "L"]},

    # ── CAKES
    {"category_slug": "colazione", "name": "Crostata Bio",
     "description": "Crostata artigianale con marmellata di stagione.",
     "price": 3.50, "image_url": PH, "badge": None, "order": 15, "tags": ["G", "L", "E"]},

    {"category_slug": "colazione", "name": "Yogurt al Cioccolato & Agrumi",
     "description": "Cremoso yogurt al cioccolato con agrumi freschi.",
     "price": 3.50, "image_url": PH, "badge": None, "order": 16, "tags": ["G", "L", "E"]},

    # ── COOKIES
    {"category_slug": "colazione", "name": "Cookie Artigianali",
     "description": "Produzione giornaliera: vaniglia & zucchero di canna, biscotti al rosmarino, cookie cioccolato fondente & maldon, cookie alle mandorle.",
     "price": 1.50, "image_url": PH, "badge": "Daily", "order": 17, "tags": ["G", "L", "E", "N"]},

    # ═══════════════════════════════════════════════════════════════
    #  BOWLS & LUNCH — Create Your Bowl + Tierra Plate
    # ═══════════════════════════════════════════════════════════════
    {"category_slug": "bowls", "name": "Medium Bowl — Create Your Bowl",
     "description": "150g riso, 150g verdure di stagione. Scegli la tua proteina (carne +€2, pesce +€3, vegan +€2) e i tuoi extra.",
     "price": 13.00, "image_url": "https://images.unsplash.com/photo-1759922222212-3657d43bd5b5?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
     "badge": "Most Popular", "order": 1, "tags": []},

    {"category_slug": "bowls", "name": "Large Bowl — Create Your Bowl",
     "description": "200g riso, 180g verdure di stagione. Scegli la tua proteina (carne +€2, pesce +€3, vegan +€2) e i tuoi extra.",
     "price": 15.00, "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
     "badge": None, "order": 2, "tags": []},

    {"category_slug": "bowls", "name": "Tierra Plate",
     "description": "Due proteine incluse + verdure di stagione. La nostra firma per chi vuole assaggiare di più.",
     "price": 17.00, "image_url": PH, "badge": "Chef's Choice", "order": 3, "tags": []},

    # ═══════════════════════════════════════════════════════════════
    #  PIATTI DEL GIORNO — Today's Specials
    # ═══════════════════════════════════════════════════════════════
    {"category_slug": "piatti-del-giorno", "name": "Vitello Tonnato",
     "description": "Sottili fette di vitello, salsa tonnata classica, capperi.",
     "price": 22.00, "image_url": PH, "badge": "Special", "order": 1, "tags": ["F", "E"]},

    {"category_slug": "piatti-del-giorno", "name": "Roast Beef Plate",
     "description": "Roast beef cotto rosa, contorno di stagione.",
     "price": 18.00, "image_url": PH, "badge": None, "order": 2, "tags": []},

    {"category_slug": "piatti-del-giorno", "name": "Zuppa di Pesce",
     "description": "Zuppa di pesce e crostacei freschi, crostino artigianale.",
     "price": 18.00, "image_url": PH, "badge": None, "order": 3, "tags": ["G", "F"]},

    {"category_slug": "piatti-del-giorno", "name": "Zuppa Vegetale",
     "description": "Vellutata di verdure di stagione, olio EVO a crudo.",
     "price": 15.00, "image_url": PH, "badge": "Vegan", "order": 4, "tags": []},

    # ═══════════════════════════════════════════════════════════════
    #  APERITIERRA — Drinks · Wines · Bites
    # ═══════════════════════════════════════════════════════════════
    # ── APERITIVO FORMULA
    {"category_slug": "aperitierra", "name": "Aperitivo Formula",
     "description": "Tempura di verdure, focaccia al rosmarino, hummus, pomodorini confit, selezione fritti dello chef + 1 drink standard o calice di vino.",
     "price": 15.00, "image_url": "https://images.unsplash.com/photo-1559847844-5315695dadae?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
     "badge": "Best Value", "order": 1, "tags": ["G"]},

    # ── DRINKS Classics €8
    {"category_slug": "aperitierra", "name": "Gin Tonic",
     "description": "Gin classico, tonica artigianale, lime.",
     "price": 8.00, "image_url": PH, "badge": None, "order": 2, "tags": []},

    {"category_slug": "aperitierra", "name": "Negroni",
     "description": "Gin, Campari, vermouth rosso. La ricetta originale.",
     "price": 8.00, "image_url": PH, "badge": None, "order": 3, "tags": []},

    {"category_slug": "aperitierra", "name": "Negroni Sbagliato",
     "description": "Vermouth rosso, Campari, prosecco brut.",
     "price": 8.00, "image_url": PH, "badge": None, "order": 4, "tags": []},

    {"category_slug": "aperitierra", "name": "Americano",
     "description": "Campari, vermouth rosso, soda.",
     "price": 8.00, "image_url": PH, "badge": None, "order": 5, "tags": []},

    {"category_slug": "aperitierra", "name": "Aperol Spritz",
     "description": "Aperol, prosecco, soda, fetta d'arancia.",
     "price": 8.00, "image_url": PH, "badge": None, "order": 6, "tags": []},

    {"category_slug": "aperitierra", "name": "Campari Spritz",
     "description": "Campari, prosecco, soda.",
     "price": 8.00, "image_url": PH, "badge": None, "order": 7, "tags": []},

    # ── SIGNATURE COCKTAILS €10
    {"category_slug": "aperitierra", "name": "Moscow Mule",
     "description": "Vodka, ginger beer, lime fresco.",
     "price": 10.00, "image_url": PH, "badge": "Signature", "order": 8, "tags": []},

    {"category_slug": "aperitierra", "name": "London Mule",
     "description": "Gin, ginger beer, lime fresco, cetriolo.",
     "price": 10.00, "image_url": PH, "badge": "Signature", "order": 9, "tags": []},

    {"category_slug": "aperitierra", "name": "Whisky Sour",
     "description": "Whisky bourbon, succo di limone, sciroppo, albume.",
     "price": 10.00, "image_url": PH, "badge": "Signature", "order": 10, "tags": ["E"]},

    {"category_slug": "aperitierra", "name": "Disaronno Sour",
     "description": "Disaronno, limone, albume.",
     "price": 10.00, "image_url": PH, "badge": "Signature", "order": 11, "tags": ["E"]},

    {"category_slug": "aperitierra", "name": "Hugo Spritz",
     "description": "Prosecco, sciroppo di sambuco, menta fresca.",
     "price": 10.00, "image_url": PH, "badge": None, "order": 12, "tags": []},

    {"category_slug": "aperitierra", "name": "Premium Gin Tonic",
     "description": "Gin premium di selezione (10/12€).",
     "price": 10.00, "image_url": PH, "badge": "Premium", "order": 13, "tags": []},

    {"category_slug": "aperitierra", "name": "Mocktail",
     "description": "Cocktail analcolico d'autore, frutta fresca.",
     "price": 7.00, "image_url": PH, "badge": "Alcohol-free", "order": 14, "tags": []},

    # ── WINES — White
    {"category_slug": "aperitierra", "name": "Passerina",
     "description": "Bianco fresco, agrumato, minerale.",
     "price": 7.00, "image_url": PH, "badge": "White", "order": 15, "tags": ["S"]},

    {"category_slug": "aperitierra", "name": "Pinot Grigio",
     "description": "Bianco morbido, equilibrato, fruttato.",
     "price": 7.00, "image_url": PH, "badge": "White", "order": 16, "tags": ["S"]},

    {"category_slug": "aperitierra", "name": "Sauvignon",
     "description": "Bianco aromatico, erbaceo, vibrante.",
     "price": 7.00, "image_url": PH, "badge": "White", "order": 17, "tags": ["S"]},

    # ── WINES — Red
    {"category_slug": "aperitierra", "name": "Primitivo",
     "description": "Rosso corposo, caldo, morbido.",
     "price": 8.00, "image_url": PH, "badge": "Red", "order": 18, "tags": ["S"]},

    {"category_slug": "aperitierra", "name": "Montepulciano",
     "description": "Rosso strutturato, frutta scura, speziato.",
     "price": 8.00, "image_url": PH, "badge": "Red", "order": 19, "tags": ["S"]},

    # ── BITES
    {"category_slug": "aperitierra", "name": "Eggplant Parmigiana",
     "description": "Crema di ricotta, alici, marmellata di cipolla.",
     "price": 12.00, "image_url": PH, "badge": "Signature", "order": 20, "tags": ["G", "L", "F"]},

    {"category_slug": "aperitierra", "name": "Bruschetta",
     "description": "Pane tostato, pomodoro fresco, basilico, olio EVO.",
     "price": 8.00, "image_url": PH, "badge": None, "order": 21, "tags": ["G"]},

    {"category_slug": "aperitierra", "name": "Tempura di Cardoncelli",
     "description": "Funghi cardoncelli in tempura croccante.",
     "price": 10.00, "image_url": PH, "badge": "Veggie", "order": 22, "tags": ["G"]},

    {"category_slug": "aperitierra", "name": "Tempura di Gamberi",
     "description": "Gamberi in tempura leggera, salsa agrodolce.",
     "price": 10.00, "image_url": PH, "badge": None, "order": 23, "tags": ["G", "F"]},

    {"category_slug": "aperitierra", "name": "Polpette di Melanzane",
     "description": "Polpette vegetali di melanzana, pomodoro, basilico.",
     "price": 8.00, "image_url": PH, "badge": "Veggie", "order": 24, "tags": ["G"]},

    {"category_slug": "aperitierra", "name": "Tagliere di Formaggi",
     "description": "Selezione di formaggi, marmellate artigianali, miele.",
     "price": 15.00, "image_url": PH, "badge": "Board", "order": 25, "tags": ["G", "L"]},

    {"category_slug": "aperitierra", "name": "Tagliere Salumi & Formaggi",
     "description": "Selezione di salumi italiani e formaggi. Singolo €15 / Sharing €25.",
     "price": 15.00, "image_url": PH, "badge": "Board · Sharing", "order": 26, "tags": ["G", "L"]},

    # ── BEERS
    {"category_slug": "aperitierra", "name": "Birra Artigianale Giulia Blond",
     "description": "Birra bionda artigianale a fermentazione alta.",
     "price": 7.00, "image_url": PH, "badge": "Craft", "order": 27, "tags": ["G"]},

    {"category_slug": "aperitierra", "name": "Birra Artigianale Giulia Weiss",
     "description": "Weiss di frumento, profilo agrumato.",
     "price": 7.00, "image_url": PH, "badge": "Craft", "order": 28, "tags": ["G"]},

    {"category_slug": "aperitierra", "name": "Birra Artigianale Giulia Amber",
     "description": "Ambrata maltata, struttura piena.",
     "price": 7.00, "image_url": PH, "badge": "Craft", "order": 29, "tags": ["G"]},

    # ═══════════════════════════════════════════════════════════════
    #  CAFFETTERIA & DRINKS — Coffee & Drinks blackboard
    # ═══════════════════════════════════════════════════════════════
    # ── COFFEE
    {"category_slug": "caffetteria", "name": "Espresso", "description": "Miscela bio.",
     "price": 1.20, "image_url": PH, "badge": None, "order": 1, "tags": []},
    {"category_slug": "caffetteria", "name": "Macchiato", "description": "Espresso macchiato.",
     "price": 1.50, "image_url": PH, "badge": None, "order": 2, "tags": ["L"]},
    {"category_slug": "caffetteria", "name": "Decaf", "description": "Espresso decaffeinato bio.",
     "price": 1.50, "image_url": PH, "badge": None, "order": 3, "tags": []},
    {"category_slug": "caffetteria", "name": "Caffè Latte", "description": "Espresso con latte.",
     "price": 2.50, "image_url": PH, "badge": None, "order": 4, "tags": ["L"]},
    {"category_slug": "caffetteria", "name": "Americano", "description": "Espresso lungo all'americana.",
     "price": 2.00, "image_url": PH, "badge": None, "order": 5, "tags": []},
    {"category_slug": "caffetteria", "name": "Flat White", "description": "Doppio espresso, microfoam di latte.",
     "price": 3.50, "image_url": PH, "badge": "Specialty", "order": 6, "tags": ["L"]},

    # ── CAPPUCCINO
    {"category_slug": "caffetteria", "name": "Cappuccino", "description": "Latte vaccino, scelta del latte.",
     "price": 1.80, "image_url": PH, "badge": None, "order": 7, "tags": ["L"]},
    {"category_slug": "caffetteria", "name": "Cappuccino d'Avena", "description": "Latte d'avena bio.",
     "price": 2.00, "image_url": PH, "badge": "Plant-based", "order": 8, "tags": []},
    {"category_slug": "caffetteria", "name": "Cappuccino di Soia", "description": "Latte di soia bio.",
     "price": 2.00, "image_url": PH, "badge": "Plant-based", "order": 9, "tags": []},
    {"category_slug": "caffetteria", "name": "Cappuccino di Mandorla", "description": "Latte di mandorla bio.",
     "price": 2.30, "image_url": PH, "badge": "Plant-based", "order": 10, "tags": ["N"]},
    {"category_slug": "caffetteria", "name": "Cappuccino di Cocco", "description": "Latte di cocco bio.",
     "price": 2.30, "image_url": PH, "badge": "Plant-based", "order": 11, "tags": []},

    # ── SIGNATURE JUICES
    {"category_slug": "caffetteria", "name": "Red Antiox",
     "description": "Mela, barbabietola, carota, zenzero. Ricco di antiossidanti & antociani.",
     "price": 7.00, "image_url": PH, "badge": "Signature", "order": 12, "tags": []},

    {"category_slug": "caffetteria", "name": "Green Detox",
     "description": "Finocchio, cetriolo, sedano, mela. Fresco e depurativo.",
     "price": 7.00, "image_url": PH, "badge": "Signature", "order": 13, "tags": []},

    {"category_slug": "caffetteria", "name": "ACE Boost",
     "description": "Arancia, carota, mela, zenzero. Boost vitaminico.",
     "price": 7.00, "image_url": PH, "badge": "Signature", "order": 14, "tags": []},

    # ── ORGANIC DRINKS
    {"category_slug": "caffetteria", "name": "Bio Cola", "description": "Cola biologica, no zuccheri raffinati.",
     "price": 4.00, "image_url": PH, "badge": "Bio", "order": 15, "tags": []},
    {"category_slug": "caffetteria", "name": "Chinotto", "description": "Chinotto artigianale italiano.",
     "price": 4.00, "image_url": PH, "badge": "Bio", "order": 16, "tags": []},
    {"category_slug": "caffetteria", "name": "Peach Tea", "description": "Tè freddo alla pesca bio.",
     "price": 4.00, "image_url": PH, "badge": "Bio", "order": 17, "tags": []},
    {"category_slug": "caffetteria", "name": "Acqua Naturale", "description": "Acqua naturale 50cl.",
     "price": 2.00, "image_url": PH, "badge": None, "order": 18, "tags": []},
    {"category_slug": "caffetteria", "name": "Acqua Frizzante", "description": "Acqua frizzante 50cl.",
     "price": 2.00, "image_url": PH, "badge": None, "order": 19, "tags": []},
]
