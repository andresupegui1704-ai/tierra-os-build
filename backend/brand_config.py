"""
════════════════════════════════════════════════════════════════════
 BRAND CONFIG (backend) — single source of truth for server-side
 brand data (email templates, ESC/POS receipts, API responses).

 When rebranding this template, edit ONLY THIS FILE plus
 /app/frontend/src/config/brand.js and the image assets.
════════════════════════════════════════════════════════════════════
"""

BRAND = {
    # ─── Identity ──────────────────────────────────────────────────
    "name": "Tierra",
    "full_name": "Tierra Organic Bistrot Café",
    "short_descriptor": "organic · bistrot · café",
    # ─── Contact ───────────────────────────────────────────────────
    "address_street": "Via Tirso 34",
    "address_city": "Roma",
    "address_full": "Via Tirso 34, Roma",
    "phone_display": "+39 347 991 5420",
    "phone_whatsapp": "+393479915420",
    "email": "tierraorganicbistrot@gmail.com",
    # ─── ESC/POS receipt header ────────────────────────────────────
    # Must be ASCII-safe / short (thermal 80mm = 42 cols)
    "receipt_header_title": "TIERRA",
    "receipt_header_subtitle": "Organic Bistrot Cafe",
    "receipt_header_address": "Via Tirso 34 - Roma",
    # ─── Email FROM name ──────────────────────────────────────────
    "email_from_name": "Tierra Organic Bistrot",
}
