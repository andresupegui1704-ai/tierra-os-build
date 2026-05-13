"""Restore menu_items.image_url after accidental overwrite.
Maps each item name to its best-known artifact URL."""
import os, asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

BASE = "https://customer-assets.emergentagent.com/job_tierra-bistro-menu/artifacts"

# Watercolor illustrations (raulandres17)
AVOCADO_SCRAMBLED = f"{BASE}/s4xx2heh_raulandres17_Avocado_toast_with_scrambled_eggs_and_fried_egg_f78707d6-6d7c-4812-863a-0f3b441a0a2e_1.png"
AVOCADO_TARTARE   = f"{BASE}/9av6jyik_raulandres17_Avocado_toast_with_tartare_of_raw_tuna_fish_or_s_351186fe-ccd3-4cf6-ba49-4f746d79953a_1.png"
EGGS_BACON        = f"{BASE}/3pkvxluq_raulandres17_Eggs_and_crispy_bacon_on_organic_sourdough_toast_2c0afb3d-1fdb-4b09-b622-9c47342285c3_0.png"
FRENCH_TOAST      = f"{BASE}/kus01y0g_raulandres17_French_toast_with_strawberries_and_whipped_cream_533f9fde-95fe-4e61-970e-2e1bb19757ef_3.png"
VEGAN_CROISSANT   = f"{BASE}/2jc7skbd_raulandres17_Vegan_croissant_with_hemp_seeds_and_organic_jam_91874250-7422-4e75-80dd-fae8cf8d7117_3.png"
CROISSANT_PLAIN   = f"{BASE}/34967lbz_raulandres17_Plain_organic_croissant_with_butter_illustration_ffa4c837-901b-40b8-a223-e3eaff1261cf_2.png"
CROISSANT_CHOCO   = f"{BASE}/lyqpnm0m_raulandres17_Chocolate_croissant_with_melted_dark_chocolate_i_ab2dbc1b-30c8-4f8b-9ea8-ea6396755638_0.png"
CROISSANT_MINI    = f"{BASE}/ruhukyk2_raulandres17_Mini_croissant_butter_pastry_illustration_in_Stu_3ebac13c-10d4-402e-a4cd-cb33e94dd1ec_3.png"
PECAN_BRAID       = f"{BASE}/k71kqsko_raulandres17_Pecan_braid_with_roasted_pecans_and_mable_syrup_9100de9e-62d9-4340-bfc3-047f1b301323_0.png"
BERRY_TART        = f"{BASE}/3fothwis_raulandres17_Organic_berry_tart_with_fresh_strawberries_and_c_6e71eb56-2dac-4144-b01c-fc764c4c3a6e_1.png"
CIAMBELLONE       = f"{BASE}/xg259zfr_raulandres17_CIAMBELLONE_CHOCOLATE_YOGURT_CITRUS_Ciambellone_12638dd4-4166-4dbe-b478-922cd88d86ce_1.png"
COOKIES           = f"{BASE}/j870eudc_raulandres17_Artisan_cookies_assortment_with_various_flavors_00c2f096-3edc-40aa-800a-08d98acc33de_2.png"
SANDWICH_HAM      = f"{BASE}/t8aqbed5_raulandres17_Brioche_sandwich_with_organic_ingredients_ham_an_ab218334-ce43-4a45-a4c6-eab515c1934f_2.png"
BRIOCHE_GENERIC   = f"{BASE}/9glxz9r2_raulandres17_Brioche_sandwich_with_organic_ingredients_olive_53348ba6-fb71-4067-9eb8-50b8c96c5f3d_1.png"
BRIOCHE_ROASTBEEF = f"{BASE}/6yfyo3de_raulandres17_Brioche_sandwich_with_roast_beef_and_mustard_cab_f66e5fa3-cead-47cf-9902-0e03d75a34c1_0.png"

BOWL_VEG          = f"{BASE}/c2kut0wr_raulandres17_Medium_vegetarian_bowl_with_rice_seasonal_vegeta_92864348-652d-4ece-a95f-cb70147a81be_3.png"
BOWL_MEAT         = f"{BASE}/3yenr8fg_raulandres17_Medium_meat_bowl_with_rice_seasonal_vegetables_c_421a731c-0b18-47c8-870b-6176d679d083_2.png"
BOWL_SEAFOOD_LG   = f"{BASE}/16paniga_raulandres17_Large_seafood_bowl_with_rice_seasonal_vegetables_5cacf8f9-28cc-4d44-ad56-c2fb198bae20_1.png"
SEAFOOD_PLATE     = f"{BASE}/fw5o1ws0_raulandres17_Medium_mixed_seafood_plate_with_assorted_fresh_f_4aa2cba6-8bde-4a1e-819c-07371fa1ed45_0.png"
ITALIAN_2ND       = f"{BASE}/2mv45d99_raulandres17_Italian_second_course_with_protein_and_seasonal_09009f7a-c617-4faf-867c-88a661dadac9_2.png"
CATALANA          = f"{BASE}/eud1nx8m_raulandres17_Catalana_salad_with_baked_potatoes_shrimps_octop_7b641cb4-a68f-4dc5-a1bd-cc89323a5f5b_2.png"
CHICKEN_CURRY     = f"{BASE}/1rx8unh8_raulandres17_Chicken_curry_with_aromatic_spices_and_seasonal_2591dea1-6f09-48f0-a27e-d6da0137cb55_0.png"

# Recently uploaded user images
RED_WINE   = f"{BASE}/z0bt7oaa_2AA764ED-7D54-46F5-BBE5-6CEBD6E33221_1_105_c.jpeg"
WHITE_WINE = f"{BASE}/9d6x0y4s_477887EE-149F-46EA-B200-61F60977D421_1_105_c.jpeg"
BEER       = f"{BASE}/kmy2hy48_9863C839-477D-4D18-83DE-F38EBFC68876_1_105_c.jpeg"
APERITIVO  = f"{BASE}/s8etofl1_B53847D3-9646-4FFC-8AE7-883B3DD0C879_1_105_c.jpeg"
MOSCOW     = f"{BASE}/rcjakfpc_1DE9B5A6-6803-4C45-8001-D6B1EA1B56EC.png"

# Older user-uploaded artifacts (Tempura, Polpette, Aperol, Negroni, Mocktail) — order unknown.
# We map best-guess by frequency of upload + plausibility; user can correct.
OLD_UPLOADS = [
    f"{BASE}/f63irl6i_B09DFD34-C5DD-40ED-AA90-200D0A3A3BC6_1_105_c.jpeg",
    f"{BASE}/rgg75vom_AF845D14-28A2-47AF-A3C6-42468A2D8A34_1_105_c.jpeg",
    f"{BASE}/ovufil15_F51AD68C-021B-4B1D-B579-C52CC777557B_1_105_c.jpeg",
    f"{BASE}/ccrhra7c_03274F60-7451-4D67-8682-64775420A1D3_1_105_c.jpeg",
    f"{BASE}/i18u016i_1892AA7E-C83F-4095-8AEC-11A004E635D8_1_105_c.jpeg",
]
# Unsplash safe fallbacks
COFFEE_PH = "https://images.unsplash.com/photo-1509042239860-f550ce710b93?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
COCKTAIL_PH = "https://images.unsplash.com/photo-1551024709-8f23befc6f87?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
DRINK_PH = "https://images.unsplash.com/photo-1437418747212-8d9709afab22?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
JUICE_PH = "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"
WATER_PH = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?crop=entropy&cs=srgb&fm=jpg&q=85&w=900"

MAPPING = {
    # Colazione
    "Avocado Toast": AVOCADO_SCRAMBLED,
    "Avocado Toast con Tartare": AVOCADO_TARTARE,
    "Eggs & Bacon": EGGS_BACON,
    "French Toast": FRENCH_TOAST,
    "Vegan Croissant": VEGAN_CROISSANT,
    "Cornetto Classico": CROISSANT_PLAIN,
    "Cornetto Integrale": CROISSANT_PLAIN,
    "Treccia di Pecan": PECAN_BRAID,
    "Cornetto al Cioccolato": CROISSANT_CHOCO,
    "Cornetto Farcito": CROISSANT_PLAIN,
    "Cornetto Crema al Limone": CROISSANT_PLAIN,
    "Mini Cornetto": CROISSANT_MINI,
    "Sandwich Prosciutto & Formaggio": SANDWICH_HAM,
    "Brioche Sandwich": BRIOCHE_GENERIC,
    "Crostata Bio": BERRY_TART,
    "Ciambellone Tierra": CIAMBELLONE,
    "Cookie Artigianali": COOKIES,
    # Bowls
    "Medium Bowl — Create Your Bowl": BOWL_VEG,
    "Large Bowl — Create Your Bowl": BOWL_SEAFOOD_LG,
    "Tierra Plate": BOWL_MEAT,
    # Piatti del giorno
    "Vitello Tonnato": ITALIAN_2ND,
    "Roast Beef Plate": BRIOCHE_ROASTBEEF,
    "Zuppa di Pesce": SEAFOOD_PLATE,
    "Zuppa Vegetale": BOWL_VEG,
    # Aperitierra
    "Aperitivo Formula": APERITIVO,
    "Gin Tonic": COCKTAIL_PH,
    "Negroni": OLD_UPLOADS[3],
    "Negroni Sbagliato": OLD_UPLOADS[3],
    "Americano": COCKTAIL_PH,
    "Aperol Spritz": OLD_UPLOADS[2],
    "Campari Spritz": OLD_UPLOADS[2],
    "Moscow Mule": MOSCOW,
    "London Mule": MOSCOW,
    "Whisky Sour": COCKTAIL_PH,
    "Disaronno Sour": COCKTAIL_PH,
    "Hugo Spritz": OLD_UPLOADS[2],
    "Premium Gin Tonic": COCKTAIL_PH,
    "Mocktail": OLD_UPLOADS[4],
    "Passerina": WHITE_WINE,
    "Pinot Grigio": WHITE_WINE,
    "Sauvignon": WHITE_WINE,
    "Primitivo": RED_WINE,
    "Montepulciano": RED_WINE,
    "Eggplant Parmigiana": ITALIAN_2ND,
    "Bruschetta": APERITIVO,
    "Tempura di Cardoncelli": OLD_UPLOADS[0],
    "Tempura di Gamberi": OLD_UPLOADS[0],
    "Polpette di Melanzane": OLD_UPLOADS[1],
    "Tagliere di Formaggi": APERITIVO,
    "Tagliere Salumi & Formaggi": APERITIVO,
    "Birra Artigianale Giulia Blond": BEER,
    "Birra Artigianale Giulia Weiss": BEER,
    "Birra Artigianale Giulia Amber": BEER,
    # Caffetteria
    "Espresso": COFFEE_PH,
    "Macchiato": COFFEE_PH,
    "Decaf": COFFEE_PH,
    "Caffè Latte": COFFEE_PH,
    "Americano ": COFFEE_PH,  # placeholder dupe key safety
    "Flat White": COFFEE_PH,
    "Cappuccino": COFFEE_PH,
    "Cappuccino d'Avena": COFFEE_PH,
    "Cappuccino di Soia": COFFEE_PH,
    "Cappuccino di Mandorla": COFFEE_PH,
    "Cappuccino di Cocco": COFFEE_PH,
    "Red Antiox": JUICE_PH,
    "Green Detox": JUICE_PH,
    "ACE Boost": JUICE_PH,
    "Bio Cola": DRINK_PH,
    "Chinotto": DRINK_PH,
    "Peach Tea": DRINK_PH,
    "Acqua Naturale": WATER_PH,
    "Acqua Frizzante": WATER_PH,
}

async def run():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    total, ok = 0, 0
    # Two "Americano" exist (cocktail + coffee). Set both with category-aware update.
    # Coffee Americano:
    await db.menu_items.update_one(
        {"name": "Americano", "category_slug": "caffetteria"},
        {"$set": {"image_url": COFFEE_PH}}
    )
    # Cocktail Americano:
    await db.menu_items.update_one(
        {"name": "Americano", "category_slug": "aperitierra"},
        {"$set": {"image_url": COCKTAIL_PH}}
    )
    for name, url in MAPPING.items():
        if name.strip() == "Americano":
            continue
        r = await db.menu_items.update_many({"name": name}, {"$set": {"image_url": url}})
        total += 1
        if r.matched_count:
            ok += 1
        else:
            print(f"  ⚠ not found: {name}")
    print(f"\n✅ {ok}/{total} aggiornati")

asyncio.run(run())
