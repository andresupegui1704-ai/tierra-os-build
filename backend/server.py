"""Tierra Organic Bistro — FastAPI backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks, UploadFile, File, Form, Header, Query
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import logging
import asyncio
import re
import uuid
from typing import List, Optional

from models import (
    MenuCategory, MenuCategoryCreate, MenuCategoryUpdate,
    MenuItem, MenuItemCreate, MenuItemUpdate, CustomizationGroup,
    OrderCreate, Order, ReservationCreate, Reservation,
    CheckoutRequest, PaymentTransaction, AdminLogin, AdminToken,
    Table, TableUpdate,
    SlotConfig, SlotConfigUpdate,
    TierraReservationCreate, TierraReservationUpdate,
    _now_iso, _uuid,
)
from seed_data import CATEGORIES, ITEMS
from customizations import bowl_groups, secondo_groups, CUSTOMIZATION_VERSION
from email_service import send_order_confirmation, send_reservation_confirmation
from auth import verify_admin, create_token, require_admin
from brand_config import BRAND as BRAND_CFG
import storage as obj_storage
import escpos
import image_utils
import ai_service
import tierra_os_sync

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest,
)
import stripe as stripe_sdk

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")

app = FastAPI(title="Tierra Organic Bistro API")
api = APIRouter(prefix="/api")


# ---------- Bootstrap / Seed ----------
@app.on_event("startup")
async def seed_on_startup():
    # Initialize object storage (best-effort)
    obj_storage.init_storage()
    # Seed categories
    for cat in CATEGORIES:
        existing = await db.categories.find_one({"slug": cat["slug"]}, {"_id": 0})
        if not existing:
            doc = MenuCategory(**cat).model_dump()
            await db.categories.insert_one(doc)
    # Seed items only if collection is empty (idempotent first-seed)
    count = await db.menu_items.count_documents({})
    if count == 0:
        for it in ITEMS:
            doc = MenuItem(**it).model_dump()
            await db.menu_items.insert_one(doc)
        logger.info(f"Seeded {len(ITEMS)} menu items.")
    # Seed tables (16 tables matching Tierra OS layout: I1-I8 interni, E1-E8 esterni)
    tables_count = await db.tables.count_documents({})
    if tables_count == 0:
        seed_tables = []
        # Interno: 8 tavoli da 2 coperti (I1-I8)
        for i in range(1, 9):
            seed_tables.append({
                "code": f"I{i}", "zone": "interno", "capacity": 2, "order": i,
            })
        # Esterno: 8 tavoli da 2 coperti (E1-E8)
        for i in range(1, 9):
            seed_tables.append({
                "code": f"E{i}", "zone": "esterno", "capacity": 2, "order": i,
            })
        for t in seed_tables:
            doc = Table(**t).model_dump()
            await db.tables.insert_one(doc)
        await db.tables.create_index("code", unique=True)
        logger.info(f"Seeded {len(seed_tables)} tables (8 interni + 8 esterni).")
    # Seed slot config singleton
    sc = await db.slot_config.find_one({"id": "default"}, {"_id": 0})
    if not sc:
        await db.slot_config.insert_one(SlotConfig().model_dump())
        logger.info("Seeded default slot config (60 min slots, 16 pax).")
    # Ensure customizations on Poke Bio & Secondo con contorno (idempotent by name match)
    await _ensure_customizations()


async def _ensure_customizations():
    """Upsert customization_groups on the items that support personalization.
    Re-applies when CUSTOMIZATION_VERSION changes."""
    async def apply(names: list[str], groups_fn):
        items = await db.menu_items.find({"name": {"$in": names}}, {"_id": 0}).to_list(10)
        for it in items:
            if it.get("customization_version") == CUSTOMIZATION_VERSION:
                continue
            groups = [CustomizationGroup(**g).model_dump() for g in groups_fn()]
            await db.menu_items.update_one(
                {"id": it["id"]},
                {"$set": {"customization_groups": groups, "customization_version": CUSTOMIZATION_VERSION}},
            )
            logger.info(f"Customizations v{CUSTOMIZATION_VERSION} applied to: {it['name']}")

    await apply(["Poke Media Bowl", "Poke Grande Bowl"], bowl_groups)
    await apply(["Secondo con Contorno"], secondo_groups)


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ---------- Health ----------
@api.get("/")
async def root():
    return {"status": "ok", "service": "Tierra Organic Bistro API"}


@api.get("/info")
async def restaurant_info():
    return {
        "name": os.environ.get("RESTAURANT_NAME", BRAND_CFG["full_name"]),
        "address": os.environ.get("RESTAURANT_ADDRESS", BRAND_CFG["address_full"]),
        "whatsapp": os.environ.get("RESTAURANT_WHATSAPP", BRAND_CFG["phone_whatsapp"]),
        "email": os.environ.get("RESTAURANT_EMAIL", BRAND_CFG["email"]),
    }


MAX_SPECIALS = 4


# ---------- Public Menu ----------
@api.get("/menu/categories", response_model=List[MenuCategory])
async def list_categories():
    cats = await db.categories.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return cats


@api.get("/menu/specials", response_model=List[MenuItem])
async def list_specials():
    """Top 4 specials (attivi) per banner dedicato."""
    items = await db.menu_items.find(
        {"is_special": True, "available": True}, {"_id": 0}
    ).sort("order", 1).to_list(MAX_SPECIALS)
    return [_sanitize_menu_item(i) for i in items]


@api.get("/menu/items", response_model=List[MenuItem])
async def list_items(category: Optional[str] = None, only_available: bool = False):
    q: dict = {}
    if category:
        q["category_slug"] = category
    if only_available:
        q["available"] = True
    items = await db.menu_items.find(q, {"_id": 0}).sort("order", 1).to_list(500)
    return [_sanitize_menu_item(i) for i in items]


def _sanitize_menu_item(item: dict) -> dict:
    """Filtra dalle customization options quelle disattivate (vista pubblica)."""
    groups = item.get("customization_groups") or []
    filtered_groups = []
    for g in groups:
        opts = [o for o in g.get("options", []) if o.get("available", True)]
        filtered_groups.append({**g, "options": opts})
    item["customization_groups"] = filtered_groups
    return item


# ---------- Admin Auth ----------
@api.post("/admin/login", response_model=AdminToken)
async def admin_login(payload: AdminLogin):
    if not verify_admin(payload.email, payload.password):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    return AdminToken(access_token=create_token(payload.email))


@api.get("/admin/me")
async def admin_me(email: str = Depends(require_admin)):
    return {"email": email, "role": "admin"}


# ---------- Admin: Menu Management ----------
@api.post("/admin/menu/items", response_model=MenuItem)
async def admin_create_item(payload: MenuItemCreate, _: str = Depends(require_admin)):
    item = MenuItem(**payload.model_dump())
    await db.menu_items.insert_one(item.model_dump())
    return item


@api.patch("/admin/menu/items/{item_id}", response_model=MenuItem)
async def admin_update_item(item_id: str, payload: MenuItemUpdate, _: str = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    result = await db.menu_items.find_one_and_update(
        {"id": item_id}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Piatto non trovato")
    return result


@api.post("/admin/menu/items/{item_id}/toggle", response_model=MenuItem)
async def admin_toggle_item(item_id: str, _: str = Depends(require_admin)):
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Piatto non trovato")
    new_val = not item.get("available", True)
    await db.menu_items.update_one({"id": item_id}, {"$set": {"available": new_val}})
    item["available"] = new_val
    return item


@api.post("/admin/menu/items/{item_id}/special")
async def admin_toggle_special(item_id: str, _: str = Depends(require_admin)):
    """Imposta/rimuove lo stato Special del Giorno. Max 4 attivi contemporaneamente."""
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Piatto non trovato")
    new_val = not bool(item.get("is_special"))
    if new_val:
        current = await db.menu_items.count_documents({"is_special": True, "id": {"$ne": item_id}})
        if current >= MAX_SPECIALS:
            raise HTTPException(status_code=400, detail=f"Massimo {MAX_SPECIALS} Special del Giorno. Rimuovine uno prima.")
    await db.menu_items.update_one({"id": item_id}, {"$set": {"is_special": new_val}})
    return {"id": item_id, "is_special": new_val}


@api.post("/admin/menu/items/{item_id}/option-toggle")
async def admin_toggle_option(item_id: str, group_name: str, option_name: str, _: str = Depends(require_admin)):
    """Accende/spegne una singola opzione di personalizzazione (es. proteina)."""
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Piatto non trovato")
    groups = item.get("customization_groups") or []
    found_group = None
    found_opt = None
    for g in groups:
        if g["name"] == group_name:
            found_group = g
            for o in g.get("options", []):
                if o["name"] == option_name:
                    found_opt = o
                    break
            break
    if not found_group or not found_opt:
        raise HTTPException(status_code=404, detail="Gruppo o opzione non trovata")
    found_opt["available"] = not bool(found_opt.get("available", True))
    await db.menu_items.update_one({"id": item_id}, {"$set": {"customization_groups": groups}})
    return {"item_id": item_id, "group_name": group_name, "option_name": option_name, "available": found_opt["available"]}


@api.get("/admin/menu/items", response_model=List[MenuItem])
async def admin_list_items(_: str = Depends(require_admin)):
    """Lista completa SENZA filtro pubblico: l'admin vede pure opzioni disattivate."""
    items = await db.menu_items.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return items


@api.delete("/admin/menu/items/{item_id}")
async def admin_delete_item(item_id: str, _: str = Depends(require_admin)):
    res = await db.menu_items.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Piatto non trovato")
    return {"deleted": True}


# ---------- Orders ----------
@api.post("/orders", response_model=Order)
async def create_order(payload: OrderCreate, request: Request, background_tasks: BackgroundTasks):
    # Validate items against DB and recompute total on server
    # Support OS-style items without item_id by resolving by name (case-insensitive)
    needs_resolve = [i for i in payload.items if not i.item_id and i.name]
    if needs_resolve:
        names = [i.name for i in needs_resolve]
        regex = "|".join(f"^{re.escape(n)}$" for n in names)
        resolved = await db.menu_items.find(
            {"name": {"$regex": regex, "$options": "i"}}, {"_id": 0}
        ).to_list(500)
        name_to_id = {r["name"].lower(): r["id"] for r in resolved}
        for li in needs_resolve:
            rid = name_to_id.get(li.name.lower())
            if rid:
                li.item_id = rid

    item_ids = [i.item_id for i in payload.items if i.item_id]
    db_items = await db.menu_items.find({"id": {"$in": item_ids}}, {"_id": 0}).to_list(500)
    db_map = {i["id"]: i for i in db_items}
    subtotal = 0.0
    validated_items = []
    for li in payload.items:
        dbi = db_map.get(li.item_id) if li.item_id else None
        if not dbi:
            raise HTTPException(status_code=400, detail=f"Piatto non trovato: {li.name}")
        if not dbi.get("available", True):
            raise HTTPException(status_code=400, detail=f"Piatto esaurito: {dbi['name']}")
        if li.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantità non valida")

        # Validate & price customizations server-side
        groups = dbi.get("customization_groups") or []
        groups_by_name = {g["name"]: g for g in groups}
        line_customizations = []
        customization_delta = 0.0
        seen_groups = set()
        for sel in li.customizations:
            grp = groups_by_name.get(sel.group_name)
            if not grp:
                raise HTTPException(status_code=400, detail=f"Personalizzazione non valida per {dbi['name']}: {sel.group_name}")
            seen_groups.add(sel.group_name)
            opts_by_name = {o["name"]: o for o in grp.get("options", [])}
            chosen = sel.option_names or []
            if grp.get("selection_type") == "single" and len(chosen) > 1:
                raise HTTPException(status_code=400, detail=f"{sel.group_name}: scegli una sola opzione")
            if len(chosen) < int(grp.get("min_select", 0)):
                raise HTTPException(status_code=400, detail=f"{sel.group_name}: seleziona almeno {grp.get('min_select')} opzione(i)")
            if len(chosen) > int(grp.get("max_select", 1)):
                raise HTTPException(status_code=400, detail=f"{sel.group_name}: massimo {grp.get('max_select')} opzione(i)")
            grp_delta = 0.0
            for n in chosen:
                opt = opts_by_name.get(n)
                if not opt:
                    raise HTTPException(status_code=400, detail=f"Opzione non valida: {n}")
                if not opt.get("available", True):
                    raise HTTPException(status_code=400, detail=f"Opzione non disponibile: {n}")
                grp_delta += float(opt.get("price_delta") or 0.0)
            customization_delta += grp_delta
            line_customizations.append({"group_name": sel.group_name, "option_names": chosen, "price_delta": round(grp_delta, 2)})
        # Check required groups
        for g in groups:
            if g.get("required") and g["name"] not in seen_groups:
                raise HTTPException(status_code=400, detail=f"{dbi['name']}: seleziona {g['name']}")

        unit_price = float(dbi["price"]) + customization_delta
        line_total = unit_price * li.quantity
        subtotal += line_total
        validated_items.append({
            "item_id": dbi["id"],
            "name": dbi["name"],
            "price": float(dbi["price"]),
            "quantity": li.quantity,
            "customizations": line_customizations,
            "unit_price": round(unit_price, 2),
            "line_total": round(line_total, 2),
        })

    if payload.service_type == "delivery" and not payload.delivery_address:
        raise HTTPException(status_code=400, detail="Indirizzo di consegna obbligatorio per il delivery")
    if payload.service_type == "tavolo" and not payload.table_code:
        raise HTTPException(status_code=400, detail="Codice tavolo obbligatorio per ordini al tavolo")

    # For OS dine-in orders, allow missing customer fields → use sensible defaults
    customer_name = payload.customer_name or (f"Tavolo {payload.table_code}" if payload.service_type == "tavolo" else "")
    customer_phone = payload.customer_phone or ("-" if payload.service_type == "tavolo" else "")
    if not customer_name or not customer_phone:
        raise HTTPException(status_code=400, detail="Nome e telefono cliente obbligatori")

    # Delivery fee (simple, server-side)
    delivery_fee = 3.50 if payload.service_type == "delivery" else 0.0
    total = round(subtotal + delivery_fee, 2)

    # Dine-in: no online payment required
    payment_status = "not_required" if payload.service_type == "tavolo" else "initiated"
    order_status = "open" if payload.service_type == "tavolo" else "pending_payment"

    order = Order(
        service_type=payload.service_type,
        items=validated_items,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_email=payload.customer_email,
        delivery_address=payload.delivery_address,
        scheduled_time=payload.scheduled_time,
        notes=payload.notes,
        subtotal=round(subtotal, 2),
        total=total,
        status=order_status,
        payment_status=payment_status,
        marketing_consent=bool(payload.marketing_consent),
        consent_date=_now_iso() if payload.marketing_consent else None,
        table_code=payload.table_code,
        waiter=payload.waiter,
    )
    await db.orders.insert_one(order.model_dump())

    # Push order to Tierra OS in background (fire-and-forget)
    background_tasks.add_task(_push_order_create, order.model_dump())

    # Dine-in: automatically queue a print job (no Stripe flow)
    if payload.service_type == "tavolo":
        job = {
            "id": _uuid(),
            "order_id": order.id,
            "status": "queued",
            "created_at": _now_iso(),
        }
        await db.print_queue.insert_one(job)
        logger.info("Dine-in order %s for table %s queued for print", order.id, payload.table_code)

    # Upsert marketing subscriber if opted-in
    if payload.marketing_consent and payload.customer_email:
        await db.marketing_subscribers.update_one(
            {"email": payload.customer_email.lower()},
            {
                "$set": {
                    "email": payload.customer_email.lower(),
                    "name": payload.customer_name,
                    "phone": payload.customer_phone,
                    "last_consent_at": _now_iso(),
                    "active": True,
                },
                "$setOnInsert": {
                    "first_consent_at": _now_iso(),
                },
                "$inc": {"orders_count": 1},
            },
            upsert=True,
        )
    return order


@api.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    return o


@api.get("/admin/orders", response_model=List[Order])
async def admin_list_orders(_: str = Depends(require_admin)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders


@api.post("/admin/orders/{order_id}/status")
async def admin_set_order_status(order_id: str, status: str, _: str = Depends(require_admin)):
    allowed = {"pending_payment", "paid", "preparing", "ready", "completed", "cancelled"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail="Stato non valido")
    res = await db.orders.update_one({"id": order_id}, {"$set": {"status": status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    return {"ok": True}


# ---------- Payments (Stripe) ----------
@api.post("/payments/checkout")
async def create_checkout(req: CheckoutRequest, http_request: Request):
    order = await db.orders.find_one({"id": req.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    if order.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Ordine già pagato")

    amount = float(order["total"])
    host_url = str(http_request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    origin = req.origin_url.rstrip("/")
    success_url = f"{origin}/ordine/successo?session_id={{CHECKOUT_SESSION_ID}}&order_id={order['id']}"
    cancel_url = f"{origin}/checkout?order_id={order['id']}&cancelled=1"

    session = await stripe.create_checkout_session(CheckoutSessionRequest(
        amount=amount,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"order_id": order["id"], "source": "tierra_order"},
    ))

    tx = PaymentTransaction(
        order_id=order["id"],
        session_id=session.session_id,
        amount=amount,
        currency="eur",
        metadata={"order_id": order["id"]},
    )
    await db.payment_transactions.insert_one(tx.model_dump())
    await db.orders.update_one({"id": order["id"]}, {"$set": {"stripe_session_id": session.session_id}})
    return {"url": session.url, "session_id": session.session_id}


@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, background: BackgroundTasks, http_request: Request):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Sessione non trovata")

    # Instantiate StripeCheckout to configure stripe.api_base for the emergent proxy,
    # then use raw SDK — emergentintegrations CheckoutStatusResponse fails to coerce
    # Stripe's StripeObject metadata into a plain dict via Pydantic.
    host_url = str(http_request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)  # sets stripe_sdk.api_base + api_key
    # Explicitly ensure both are set on the shared stripe module state
    stripe_sdk.api_key = STRIPE_API_KEY
    if "sk_test_emergent" in STRIPE_API_KEY:
        stripe_sdk.api_base = "https://integrations.emergentagent.com/stripe"

    logger.info(f"[stripe] retrieve {session_id} via base={stripe_sdk.api_base}")
    session = None
    last_err: Optional[Exception] = None
    for attempt in range(4):
        try:
            session = await asyncio.to_thread(stripe_sdk.checkout.Session.retrieve, session_id)
            break
        except stripe_sdk.error.InvalidRequestError as e:
            # Emergent proxy may return 404 briefly right after session creation.
            last_err = e
            await asyncio.sleep(1.2)
        except Exception as e:
            last_err = e
            break
    if session is None:
        logger.error(f"Stripe session retrieve failed after retries: {last_err}")
        # Return pending state so the UI keeps polling gracefully
        return {"status": "open", "payment_status": "unpaid", "amount_total": 0, "currency": "eur"}

    session_status = getattr(session, "status", None) or "open"
    payment_status_val = getattr(session, "payment_status", None) or "unpaid"
    amount_total = getattr(session, "amount_total", None) or 0
    currency = getattr(session, "currency", None) or "eur"

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"payment_status": payment_status_val, "status": session_status}},
    )

    if payment_status_val == "paid" and tx.get("payment_status") != "paid":
        order = await db.orders.find_one_and_update(
            {"id": tx["order_id"]},
            {"$set": {"payment_status": "paid", "status": "paid"}},
            return_document=True,
            projection={"_id": 0},
        )
        if order:
            background.add_task(send_order_confirmation, order)
            await _enqueue_print(order["id"])

    return {
        "status": session_status,
        "payment_status": payment_status_val,
        "amount_total": amount_total,
        "currency": currency,
    }


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        resp = await stripe.handle_webhook(body, signature)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")
    if resp.payment_status == "paid" and resp.session_id:
        await db.payment_transactions.update_one(
            {"session_id": resp.session_id}, {"$set": {"payment_status": "paid", "status": "complete"}}
        )
        tx = await db.payment_transactions.find_one({"session_id": resp.session_id}, {"_id": 0})
        if tx:
            order = await db.orders.find_one_and_update(
                {"id": tx["order_id"], "payment_status": {"$ne": "paid"}},
                {"$set": {"payment_status": "paid", "status": "paid"}},
                return_document=True,
                projection={"_id": 0},
            )
            if order:
                await send_order_confirmation(order)
                await _enqueue_print(order["id"])
    return {"received": True}


# ---------- Reservations: slot & capacity helpers ----------
from datetime import datetime as _dt, timedelta as _td


async def _get_slot_config() -> dict:
    sc = await db.slot_config.find_one({"id": "default"}, {"_id": 0})
    return sc or SlotConfig().model_dump()


def _slot_start(time_str: str, slot_minutes: int) -> str:
    """Given '12:45' and 60 → '12:00'; with 30 → '12:30'."""
    h, m = time_str.split(":")
    total = int(h) * 60 + int(m)
    snapped = (total // slot_minutes) * slot_minutes
    return f"{snapped // 60:02d}:{snapped % 60:02d}"


def _slot_bounds(time_str: str, slot_minutes: int) -> tuple:
    start = _slot_start(time_str, slot_minutes)
    sh, sm = start.split(":")
    start_total = int(sh) * 60 + int(sm)
    end_total = start_total + slot_minutes
    end = f"{(end_total // 60) % 24:02d}:{end_total % 60:02d}"
    return start, end


async def _slot_usage(date: str, time_str: str, slot_minutes: int,
                      exclude_id: Optional[str] = None) -> dict:
    """Return current guest count in the slot, split by zone."""
    start, end = _slot_bounds(time_str, slot_minutes)
    q: dict = {
        "date": date,
        "time": {"$gte": start, "$lt": end},
        "status": {"$in": ["pending", "confirmed", "arrived"]},
    }
    if exclude_id:
        q["id"] = {"$ne": exclude_id}
    rows = await db.reservations.find(q, {"_id": 0, "guests": 1, "zone": 1}).to_list(500)
    total = sum(r.get("guests", 0) for r in rows)
    by_zone = {"interno": 0, "esterno": 0}
    for r in rows:
        z = r.get("zone")
        if z in by_zone:
            by_zone[z] += r.get("guests", 0)
    return {"slot_start": start, "slot_end": end, "total": total, "by_zone": by_zone, "count": len(rows)}


async def _check_capacity(date: str, time_str: str, guests: int,
                          zone: Optional[str] = None,
                          exclude_id: Optional[str] = None) -> dict:
    """Raise 409 if slot is saturated. Return a dict with availability info."""
    cfg = await _get_slot_config()
    usage = await _slot_usage(date, time_str, cfg["slot_minutes"], exclude_id=exclude_id)
    max_total = cfg["max_guests_per_slot"]
    max_per_zone = cfg.get("max_per_zone") or {}

    # Total check
    remaining_total = max_total - usage["total"]
    remaining_by_zone = {z: (max_per_zone.get(z, max_total) - usage["by_zone"].get(z, 0)) for z in ("interno", "esterno")}
    info = {
        "slot_start": usage["slot_start"],
        "slot_end": usage["slot_end"],
        "booked_total": usage["total"],
        "booked_by_zone": usage["by_zone"],
        "max_total": max_total,
        "max_by_zone": max_per_zone,
        "remaining_total": remaining_total,
        "remaining_by_zone": remaining_by_zone,
        "saturated": remaining_total <= 0,
    }

    if remaining_total < guests:
        raise HTTPException(
            status_code=409,
            detail={
                "message": (
                    f"Fascia oraria {usage['slot_start']}-{usage['slot_end']} satura: "
                    f"{usage['total']}/{max_total} coperti già prenotati. "
                    f"Rimangono {max(0, remaining_total)} posti."
                ),
                "availability": info,
            },
        )
    if zone and zone in max_per_zone:
        zone_remaining = max_per_zone[zone] - usage["by_zone"].get(zone, 0)
        if zone_remaining < guests:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": (
                        f"Zona '{zone}' satura nella fascia {usage['slot_start']}-{usage['slot_end']}: "
                        f"{usage['by_zone'].get(zone,0)}/{max_per_zone[zone]} già prenotati."
                    ),
                    "availability": info,
                },
            )
    return info


# ---------- Reservations ----------
@api.get("/reservations/availability")
async def reservations_availability(date: str, time: str, guests: int = 1, zone: Optional[str] = None):
    """
    Public availability check. Returns saturation info for the given slot.
    Used by Tierra OS / website form to warn BEFORE attempting to submit.
    """
    cfg = await _get_slot_config()
    usage = await _slot_usage(date, time, cfg["slot_minutes"])
    max_total = cfg["max_guests_per_slot"]
    max_per_zone = cfg.get("max_per_zone") or {}
    remaining_total = max_total - usage["total"]
    remaining_by_zone = {z: (max_per_zone.get(z, max_total) - usage["by_zone"].get(z, 0)) for z in ("interno", "esterno")}
    can_fit = remaining_total >= guests and (not zone or remaining_by_zone.get(zone, max_total) >= guests)
    return {
        "date": date,
        "slot_start": usage["slot_start"],
        "slot_end": usage["slot_end"],
        "slot_minutes": cfg["slot_minutes"],
        "booked_total": usage["total"],
        "booked_by_zone": usage["by_zone"],
        "max_total": max_total,
        "max_by_zone": max_per_zone,
        "remaining_total": max(0, remaining_total),
        "remaining_by_zone": {k: max(0, v) for k, v in remaining_by_zone.items()},
        "saturated": remaining_total <= 0,
        "can_fit": bool(can_fit),
    }


@api.post("/reservations", response_model=Reservation)
async def create_reservation(payload: ReservationCreate, background: BackgroundTasks):
    """Customer-facing endpoint: create a reservation in PENDING status.

    Raises 409 if the slot is already saturated.
    No email + no print is triggered until admin explicitly confirms via
    POST /admin/reservations/{id}/status?status=confirmed.

    On success, fires an outgoing push to Tierra OS (Lark + GCal) in background.
    """
    if payload.guests < 1 or payload.guests > 20:
        raise HTTPException(status_code=400, detail="Numero ospiti non valido (1-20)")
    await _check_capacity(payload.date, payload.time, payload.guests, zone=payload.zone)
    res = Reservation(**payload.model_dump(), source="website")
    await db.reservations.insert_one(res.model_dump())
    logger.info("Reservation %s created (pending) for %s guests on %s %s",
                res.id, res.guests, res.date, res.time)
    # Fire-and-forget push to Tierra OS
    background.add_task(_push_reservation_create, res.model_dump())
    return res


@api.get("/admin/reservations", response_model=List[Reservation])
async def admin_list_reservations(_: str = Depends(require_admin)):
    rows = await db.reservations.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@api.post("/admin/reservations/{res_id}/status")
async def admin_set_res_status(
    res_id: str,
    status: str,
    background: BackgroundTasks,
    _: str = Depends(require_admin),
):
    """Update reservation status. On "confirmed" → send email + queue a print job."""
    allowed = {"pending", "confirmed", "arrived", "cancelled", "no_show"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail="Stato non valido")
    existing = await db.reservations.find_one({"id": res_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    previous_status = existing.get("status")

    # On confirmation from a non-confirmed state, re-check capacity
    if status == "confirmed" and previous_status != "confirmed":
        await _check_capacity(
            existing["date"], existing["time"], existing["guests"],
            zone=existing.get("zone"), exclude_id=res_id,
        )

    await db.reservations.update_one(
        {"id": res_id},
        {"$set": {"status": status, "status_updated_at": _now_iso()}},
    )
    existing["status"] = status

    # Confirmation side-effects: email + print (only on transition INTO "confirmed")
    if status == "confirmed" and previous_status != "confirmed":
        if existing.get("customer_email"):
            background.add_task(send_reservation_confirmation, existing)
        await _queue_reservation_print(res_id)
        logger.info("Reservation %s confirmed → email + print queued", res_id)

    return {"ok": True, "status": status}


# ---------- Admin: Categories CRUD ----------
@api.post("/admin/menu/categories", response_model=MenuCategory)
async def admin_create_category(payload: MenuCategoryCreate, _: str = Depends(require_admin)):
    existing = await db.categories.find_one({"slug": payload.slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Slug già esistente")
    cat = MenuCategory(**payload.model_dump())
    await db.categories.insert_one(cat.model_dump())
    return cat


@api.patch("/admin/menu/categories/{cat_id}", response_model=MenuCategory)
async def admin_update_category(cat_id: str, payload: MenuCategoryUpdate, _: str = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    result = await db.categories.find_one_and_update(
        {"id": cat_id}, {"$set": update}, return_document=True, projection={"_id": 0}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    return result


@api.delete("/admin/menu/categories/{cat_id}")
async def admin_delete_category(cat_id: str, _: str = Depends(require_admin)):
    cat = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    n = await db.menu_items.count_documents({"category_slug": cat["slug"]})
    if n > 0:
        raise HTTPException(status_code=400, detail=f"Categoria non vuota: contiene {n} piatti")
    await db.categories.delete_one({"id": cat_id})
    return {"deleted": True}


# ---------- Admin: Uploads (object storage) ----------
_ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_APP_NAME = os.environ.get("APP_NAME", "tierra-bistro")
_MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8 MB


@api.post("/admin/uploads")
async def admin_upload_image(file: UploadFile = File(...), usage: str = Form("dish"), _: str = Depends(require_admin)):
    if file.content_type not in _ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Formato non supportato. Usa JPG, PNG, WEBP o GIF.")
    data = await file.read()
    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File troppo grande (max 8 MB)")
    # Process: resize + convert to WebP per la guida Tierra
    try:
        processed, content_type = await asyncio.to_thread(image_utils.process_image, data, usage)
    except Exception as e:
        logger.error(f"Image processing failed: {e}")
        raise HTTPException(status_code=400, detail="Immagine non valida o corrotta")
    file_id = str(uuid.uuid4())
    path = f"{_APP_NAME}/{usage}/{file_id}.webp"
    try:
        result = await asyncio.to_thread(obj_storage.put_object, path, processed, content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=502, detail="Caricamento fallito, riprova")
    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(processed)),
        "usage": usage,
        "is_deleted": False,
        "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    })
    return {"id": file_id, "url": f"/api/files/{file_id}", "path": result["path"], "usage": usage, "size": result.get("size", len(processed))}


@api.get("/files/{file_id}")
async def serve_file(file_id: str):
    """Public file serving (images on menu should be visible to anyone)."""
    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File non trovato")
    try:
        data, ct = await asyncio.to_thread(obj_storage.get_object, record["storage_path"])
    except Exception as e:
        logger.error(f"Storage get failed: {e}")
        raise HTTPException(status_code=502, detail="Errore recupero file")
    return Response(content=data, media_type=record.get("content_type") or ct, headers={"Cache-Control": "public, max-age=86400"})


# ---------- Print queue (polled by local Sunmi print agent) ----------
def _require_print_agent(x_print_token: str = Header(default="")) -> bool:
    expected = os.environ.get("PRINT_AGENT_TOKEN", "")
    if not expected or x_print_token != expected:
        raise HTTPException(status_code=401, detail="Invalid print agent token")
    return True


@api.get("/print/pending")
async def print_pending(_: bool = Depends(_require_print_agent), limit: int = 10):
    """Print agent polls this. Returns queued print jobs as ESC/POS payloads.

    Supports two job types:
      - Orders (default) → kitchen + cashier tickets
      - Reservations (job_type='reservation') → 2 identical confirmation tickets
    """
    jobs = await db.print_queue.find({"status": "queued"}, {"_id": 0}).sort("created_at", 1).to_list(max(1, min(limit, 20)))
    output = []
    for j in jobs:
        if j.get("job_type") == "reservation":
            res = await db.reservations.find_one({"id": j.get("reservation_id")}, {"_id": 0})
            if not res:
                continue
            output.append({
                "job_id": j["id"],
                "job_type": "reservation",
                "reservation_id": j["reservation_id"],
                "created_at": j["created_at"],
                "escpos_base64": escpos.encode_reservation_job(res),
            })
        else:
            order = await db.orders.find_one({"id": j.get("order_id")}, {"_id": 0})
            if not order:
                continue
            output.append({
                "job_id": j["id"],
                "job_type": "order",
                "order_id": j["order_id"],
                "created_at": j["created_at"],
                "escpos_base64": escpos.encode_job(order, mode="kitchen+cashier"),
            })
    return {"jobs": output}


@api.post("/print/ack/{job_id}")
async def print_ack(job_id: str, success: bool = True, _: bool = Depends(_require_print_agent)):
    status = "printed" if success else "failed"
    r = await db.print_queue.update_one({"id": job_id}, {"$set": {"status": status, "acked_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job non trovato")
    return {"ok": True, "status": status}


@api.post("/admin/print/reprint/{order_id}")
async def admin_reprint(order_id: str, _: str = Depends(require_admin)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    job = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "status": "queued",
        "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }
    await db.print_queue.insert_one(job)
    return {"ok": True, "job_id": job["id"]}


async def _enqueue_print(order_id: str) -> None:
    job = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "status": "queued",
        "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }
    await db.print_queue.insert_one(job)


@api.get("/admin/print/queue")
async def admin_print_queue(_: str = Depends(require_admin)):
    rows = await db.print_queue.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return rows


# ---------- Statistics ----------
@api.get("/admin/stats/sales")
async def admin_sales_stats(
    start: Optional[str] = None,  # ISO date or datetime
    end: Optional[str] = None,
    _: str = Depends(require_admin),
):
    """
    Aggregate sales per menu item within [start, end].
    Only paid orders are counted. Returns totals + per-item breakdown sorted by quantity.
    """
    match: dict = {"payment_status": "paid"}
    if start or end:
        created_range: dict = {}
        if start:
            created_range["$gte"] = start
        if end:
            created_range["$lte"] = end
        if created_range:
            match["created_at"] = created_range

    pipeline = [
        {"$match": match},
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": {"item_id": "$items.item_id", "name": "$items.name"},
                "quantity": {"$sum": "$items.quantity"},
                "revenue": {
                    "$sum": {
                        "$ifNull": ["$items.line_total", {"$multiply": ["$items.price", "$items.quantity"]}]
                    }
                },
                "orders": {"$addToSet": "$_id"},
            }
        },
        {
            "$project": {
                "_id": 0,
                "item_id": "$_id.item_id",
                "name": "$_id.name",
                "quantity": 1,
                "revenue": {"$round": ["$revenue", 2]},
                "orders_count": {"$size": "$orders"},
            }
        },
        {"$sort": {"quantity": -1}},
    ]
    items_agg = await db.orders.aggregate(pipeline).to_list(1000)

    # Top-level totals
    totals_pipeline = [
        {"$match": match},
        {
            "$group": {
                "_id": None,
                "orders": {"$sum": 1},
                "revenue": {"$sum": "$total"},
                "avg_ticket": {"$avg": "$total"},
            }
        },
    ]
    totals_rows = await db.orders.aggregate(totals_pipeline).to_list(1)
    totals = totals_rows[0] if totals_rows else {"orders": 0, "revenue": 0, "avg_ticket": 0}
    return {
        "start": start,
        "end": end,
        "totals": {
            "orders": totals.get("orders", 0),
            "revenue": round(float(totals.get("revenue") or 0), 2),
            "avg_ticket": round(float(totals.get("avg_ticket") or 0), 2),
        },
        "items": items_agg,
    }


# ---------- Marketing subscribers ----------
@api.get("/admin/marketing/subscribers")
async def admin_marketing_subscribers(_: str = Depends(require_admin)):
    rows = await db.marketing_subscribers.find(
        {"active": True}, {"_id": 0}
    ).sort("last_consent_at", -1).to_list(2000)
    return rows


@api.delete("/admin/marketing/subscribers/{email}")
async def admin_marketing_unsubscribe(email: str, _: str = Depends(require_admin)):
    res = await db.marketing_subscribers.update_one(
        {"email": email.lower()}, {"$set": {"active": False, "unsubscribed_at": _now_iso()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Iscritto non trovato")
    return {"ok": True}


# ---------- Auth helpers for external systems ----------
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "")
TIERRA_TOKEN = os.environ.get("TIERRA_TOKEN", "tierra2024")


def _require_webhook(x_webhook_token: str = Header(default="")) -> bool:
    if not WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    if x_webhook_token != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook token")
    return True


def _require_tierra_token(x_tierra_token: str = Header(default="")) -> bool:
    if x_tierra_token != TIERRA_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid Tierra token")
    return True


# ---------- Tables (dining room) ----------
@api.get("/tables")
async def list_tables(zone: Optional[str] = None, include_reservations: bool = True):
    """
    Public read-only endpoint. Returns all tables, optionally filtered by zone.
    If include_reservations=True (default), also enriches each table with
    today's reservation (if any).
    """
    query: dict = {}
    if zone in ("interno", "esterno"):
        query["zone"] = zone
    tables = await db.tables.find(query, {"_id": 0}).sort([("zone", 1), ("order", 1)]).to_list(500)

    if include_reservations:
        from datetime import date as _date
        today_iso = _date.today().isoformat()
        reservations = await db.reservations.find(
            {"date": today_iso, "table_code": {"$ne": None}, "status": {"$in": ["pending", "confirmed", "arrived"]}},
            {"_id": 0},
        ).to_list(500)
        by_table: dict = {}
        for r in reservations:
            by_table.setdefault(r["table_code"], []).append(r)
        for t in tables:
            t["reservations_today"] = by_table.get(t["code"], [])

    return tables


@api.get("/tables/{code}")
async def get_table(code: str):
    t = await db.tables.find_one({"code": code.upper()}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail=f"Tavolo {code} non trovato")
    return t


@api.patch("/tables/{code}")
async def update_table(
    code: str,
    payload: TableUpdate,
    _: bool = Depends(_require_tierra_token),
):
    """Update table state. Requires header X-Tierra-Token.

    Accepts both Italian ("riservato","libero","occupato","confermato",...) and
    English aliases ("reserved","free","busy",...) — auto-normalized.
    """
    from models import _normalize_table_status
    updates: dict = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "status" in updates:
        updates["status"] = _normalize_table_status(updates["status"])
    if not updates:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    updates["updated_at"] = _now_iso()
    res = await db.tables.update_one({"code": code.upper()}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Tavolo {code} non trovato")
    doc = await db.tables.find_one({"code": code.upper()}, {"_id": 0})
    logger.info("Table %s updated → %s", code, updates)
    return doc


@api.get("/tables/{code}/orders")
async def list_table_orders(code: str, open_only: bool = True):
    """Return orders for a given table. By default only open (not paid/completed)."""
    q: dict = {"table_code": code.upper()}
    if open_only:
        q["status"] = {"$in": ["open", "preparing", "ready"]}
    rows = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return rows


@api.post("/tables/{code}/close")
async def close_table(
    code: str,
    _: bool = Depends(_require_tierra_token),
):
    """Mark table as libero + mark open orders as completed. Used when bill is paid."""
    now = _now_iso()
    await db.orders.update_many(
        {"table_code": code.upper(), "status": {"$in": ["open", "preparing", "ready"]}},
        {"$set": {"status": "completed", "payment_status": "paid", "closed_at": now}},
    )
    res = await db.tables.update_one(
        {"code": code.upper()}, {"$set": {"status": "libero", "merged_with": [], "updated_at": now}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Tavolo {code} non trovato")
    return {"ok": True, "code": code.upper()}


# ---------- Tierra OS reservations ----------
async def _queue_reservation_print(res_id: str):
    """Idempotent: only queue if not already queued for this reservation."""
    existing = await db.print_queue.find_one(
        {"reservation_id": res_id, "status": {"$in": ["queued", "printed"]}},
        {"_id": 0},
    )
    if existing:
        return
    job = {
        "id": _uuid(),
        "reservation_id": res_id,
        "job_type": "reservation",
        "status": "queued",
        "created_at": _now_iso(),
    }
    await db.print_queue.insert_one(job)


@api.post("/tierra/reservations", response_model=Reservation)
async def tierra_create_reservation(
    payload: TierraReservationCreate,
    background: BackgroundTasks,
    idempotency_key: str = Header(default="", alias="Idempotency-Key"),
    _: bool = Depends(_require_tierra_token),
):
    """Tierra OS endpoint: create a reservation (auto-confirmed + auto-printed by default).

    Raises 409 if the slot is saturated.
    Honors Idempotency-Key header to safely retry the same request.
    """
    if idempotency_key:
        cached = await db.idempotency.find_one({"key": idempotency_key}, {"_id": 0})
        if cached and cached.get("response"):
            return Reservation(**cached["response"])

    if payload.guests < 1 or payload.guests > 20:
        raise HTTPException(status_code=400, detail="Numero ospiti non valido (1-20)")
    await _check_capacity(payload.date, payload.time, payload.guests, zone=payload.zone)

    data = payload.model_dump()
    # Remove auto_print from reservation doc (it's a control flag)
    auto_print = data.pop("auto_print", True)
    # Map zone correctly — Reservation schema also supports zone
    res = Reservation(**data, source="tierra_os")
    await db.reservations.insert_one(res.model_dump())

    # If confirmed → email + print
    if res.status == "confirmed":
        if res.customer_email:
            background.add_task(send_reservation_confirmation, res.model_dump())
        if auto_print:
            await _queue_reservation_print(res.id)
    logger.info("Tierra OS reservation %s created status=%s", res.id, res.status)

    # Idempotency cache
    await _idempotency_store(idempotency_key, res.model_dump())
    return res


@api.patch("/tierra/reservations/{res_id}", response_model=Reservation)
async def tierra_update_reservation(
    res_id: str,
    payload: TierraReservationUpdate,
    background: BackgroundTasks,
    _: bool = Depends(_require_tierra_token),
):
    """Tierra OS endpoint: update an existing reservation (incl. status).

    Capacity is re-checked if date/time/guests/zone change.
    Transition TO confirmed triggers email + print job (idempotent).
    """
    existing = await db.reservations.find_one({"id": res_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")

    # Capacity recheck if relevant fields change
    new_date = updates.get("date", existing["date"])
    new_time = updates.get("time", existing["time"])
    new_guests = updates.get("guests", existing["guests"])
    new_zone = updates.get("zone", existing.get("zone"))
    # Only check if status not cancelled and not no_show
    new_status = updates.get("status", existing.get("status"))
    if new_status not in ("cancelled", "no_show"):
        await _check_capacity(new_date, new_time, new_guests, zone=new_zone, exclude_id=res_id)

    previous_status = existing.get("status")
    updates["status_updated_at"] = _now_iso()
    await db.reservations.update_one({"id": res_id}, {"$set": updates})
    merged = {**existing, **updates}

    # Transition-to-confirmed side effects
    if new_status == "confirmed" and previous_status != "confirmed":
        if merged.get("customer_email"):
            background.add_task(send_reservation_confirmation, merged)
        await _queue_reservation_print(res_id)
        logger.info("Tierra OS reservation %s → confirmed (email+print queued)", res_id)

    return Reservation(**merged)


@api.delete("/tierra/reservations/{res_id}")
async def tierra_cancel_reservation(
    res_id: str,
    _: bool = Depends(_require_tierra_token),
):
    """Soft-delete: mark as cancelled (frees the slot)."""
    res = await db.reservations.update_one(
        {"id": res_id}, {"$set": {"status": "cancelled", "status_updated_at": _now_iso()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    return {"ok": True, "id": res_id, "status": "cancelled"}


# ---------- Admin slot config ----------
@api.get("/admin/slots/config", response_model=SlotConfig)
async def admin_get_slot_config(_: str = Depends(require_admin)):
    sc = await db.slot_config.find_one({"id": "default"}, {"_id": 0})
    return sc or SlotConfig().model_dump()


@api.put("/admin/slots/config", response_model=SlotConfig)
async def admin_update_slot_config(payload: SlotConfigUpdate, _: str = Depends(require_admin)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nessun campo da aggiornare")
    updates["updated_at"] = _now_iso()
    await db.slot_config.update_one({"id": "default"}, {"$set": updates}, upsert=True)
    sc = await db.slot_config.find_one({"id": "default"}, {"_id": 0})
    return sc


# ---------- Webhooks (external systems e.g. Tierra OS / Lark Base) ----------


# ---------- Webhooks (external systems e.g. Tierra OS / Lark Base) ----------
@api.post("/ai/analyze-invoice")
async def ai_analyze_invoice(
    payload: dict,
    _: bool = Depends(_require_tierra_token),
):
    """Analyze an invoice/receipt image and return structured data.

    Auth: X-Tierra-Token

    Body:
    {
        "image_base64": "<base64 JPEG/PNG/WEBP, no data: prefix>",
        "media_type": "image/jpeg"  // optional
    }

    Response:
    {
        "fornitore": "...",
        "importo": 125.50,
        "data": "2026-04-20",
        "scadenza": "2026-05-20",
        "categoria": "Alimentari",
        "note": "P.IVA IT12345 - Fattura 123"
    }
    """
    img = payload.get("image_base64")
    if not img or not isinstance(img, str):
        raise HTTPException(status_code=400, detail="Campo 'image_base64' mancante o non valido")
    media_type = payload.get("media_type", "image/jpeg")
    try:
        result = await ai_service.analyze_invoice(img, media_type=media_type)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI non ha restituito JSON valido: {e}")
    except Exception as e:
        logger.exception("Invoice analysis failed")
        raise HTTPException(status_code=500, detail=f"Errore analisi fattura: {e}")
    return result


@api.patch("/menu/availability")
async def patch_menu_availability(
    payload: dict,
    _: bool = Depends(_require_tierra_token),
):
    """
    Update availability for one or more menu items.

    Auth:  X-Tierra-Token: tierra2024   (configurable via env TIERRA_TOKEN)

    Body:
    {
        "items": [
            {"id": "<uuid>", "available": true},
            {"name": "Avocado Toast", "available": false}
        ]
    }

    Returns 200 with:
    {
        "updated": [ { id, name, available, matched_by }, ... ],
        "not_found": [ "<id or name>", ... ]
    }
    """
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        raise HTTPException(status_code=400, detail="Field 'items' must be a non-empty array")

    updated: list = []
    not_found: list = []
    for it in items:
        if not isinstance(it, dict) or "available" not in it:
            raise HTTPException(status_code=400, detail="Each item must include 'available'")
        available = bool(it["available"])
        item_id = it.get("id")
        item_name = it.get("name")
        if item_id:
            query = {"id": str(item_id)}
            matched_by = "id"
            ref = item_id
        elif item_name:
            query = {"name": {"$regex": f"^{re.escape(str(item_name))}$", "$options": "i"}}
            matched_by = "name"
            ref = item_name
        else:
            raise HTTPException(status_code=400, detail="Each item must include either 'id' or 'name'")

        res = await db.menu_items.update_one(query, {"$set": {"available": available}})
        if res.matched_count == 0:
            not_found.append(ref)
            continue
        doc = await db.menu_items.find_one(query, {"_id": 0, "id": 1, "name": 1, "available": 1})
        if doc:
            updated.append({**doc, "matched_by": matched_by})

    logger.info(
        "PATCH /menu/availability — updated=%s not_found=%s", len(updated), not_found,
    )
    return {"updated": updated, "not_found": not_found}


@api.post("/webhooks/menu/availability")
async def webhook_set_availability(
    payload: dict,
    _: bool = Depends(_require_webhook),
):
    """
    Update a single menu item's availability by id or by name (case-insensitive match).

    Body (JSON):
    {
        "item_id": "uuid",           // optional
        "item_name": "Avocado Toast", // optional (used if item_id missing)
        "available": true,           // required
        "source": "tierra-os"        // optional, for logs
    }

    Returns: { ok, item_id, name, available, matched_by }
    """
    if "available" not in payload:
        raise HTTPException(status_code=400, detail="Field 'available' is required")
    available = bool(payload["available"])
    item_id = payload.get("item_id")
    item_name = payload.get("item_name") or payload.get("name")

    query = None
    matched_by = None
    if item_id:
        query = {"id": str(item_id)}
        matched_by = "id"
    elif item_name:
        # Case-insensitive exact match on name
        query = {"name": {"$regex": f"^{re.escape(str(item_name))}$", "$options": "i"}}
        matched_by = "name"
    else:
        raise HTTPException(status_code=400, detail="Provide either 'item_id' or 'item_name'")

    result = await db.menu_items.find_one_and_update(
        query,
        {"$set": {"available": available}},
        projection={"_id": 0},
        return_document=True,
    ) if hasattr(db.menu_items, "find_one_and_update") else None

    # Motor supports find_one_and_update; fallback for safety
    if result is None:
        # Try update_one + find_one (defensive)
        upd = await db.menu_items.update_one(query, {"$set": {"available": available}})
        if upd.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Piatto non trovato ({matched_by}={item_id or item_name})")
        result = await db.menu_items.find_one(query, {"_id": 0})

    logger.info(
        "Webhook availability update — source=%s matched_by=%s item=%s → available=%s",
        payload.get("source", "unknown"), matched_by, result.get("name"), available,
    )
    return {
        "ok": True,
        "item_id": result.get("id"),
        "name": result.get("name"),
        "available": result.get("available"),
        "matched_by": matched_by,
    }


@api.post("/webhooks/menu/availability/bulk")
async def webhook_set_availability_bulk(
    payload: dict,
    _: bool = Depends(_require_webhook),
):
    """
    Bulk update availability for multiple items.

    Body:
    {
        "items": [
            {"item_name": "Avocado Toast", "available": true},
            {"item_id": "uuid", "available": false}
        ],
        "source": "tierra-os"
    }

    Returns: { ok, updated: int, not_found: [name|id...], results: [...] }
    """
    items = payload.get("items") or []
    if not isinstance(items, list) or not items:
        raise HTTPException(status_code=400, detail="Field 'items' must be a non-empty array")

    updated = 0
    not_found: list = []
    results: list = []
    for it in items:
        if "available" not in it:
            continue
        available = bool(it["available"])
        item_id = it.get("item_id")
        item_name = it.get("item_name") or it.get("name")
        if item_id:
            query = {"id": str(item_id)}
            ref = item_id
        elif item_name:
            query = {"name": {"$regex": f"^{re.escape(str(item_name))}$", "$options": "i"}}
            ref = item_name
        else:
            continue

        upd = await db.menu_items.update_one(query, {"$set": {"available": available}})
        if upd.matched_count == 0:
            not_found.append(ref)
            continue
        updated += 1
        doc = await db.menu_items.find_one(query, {"_id": 0, "id": 1, "name": 1, "available": 1})
        if doc:
            results.append(doc)

    logger.info(
        "Webhook bulk availability — source=%s updated=%s not_found=%s",
        payload.get("source", "unknown"), updated, not_found,
    )
    return {"ok": True, "updated": updated, "not_found": not_found, "results": results}


# ---------- Tierra OS sync helpers (outgoing push) ----------
async def _push_reservation_create(res_doc: dict) -> None:
    """Background task: push a new reservation to Tierra OS, store returned recordId."""
    try:
        record_id = await tierra_os_sync.push_reservation_create(res_doc)
        if record_id:
            await db.reservations.update_one(
                {"id": res_doc["id"]},
                {"$set": {"booking_id": record_id, "os_record_id": record_id}},
            )
    except Exception as e:
        logger.warning("Push reservation %s to Tierra OS failed: %s", res_doc.get("id"), e)


async def _push_order_create(order_doc: dict) -> None:
    try:
        await tierra_os_sync.push_order_create(order_doc)
    except Exception as e:
        logger.warning("Push order %s to Tierra OS failed: %s", order_doc.get("id"), e)


# ---------- Idempotency for Tierra endpoints ----------
async def _idempotency_check(
    idempotency_key: str = Header(default="", alias="Idempotency-Key"),
) -> Optional[dict]:
    """If header present, return cached response (if any) for replay protection.

    On miss, returns None and the route handler is expected to call
    `_idempotency_store(key, payload)` after producing the response.
    Records expire after 24h via TTL index (created on startup).
    """
    if not idempotency_key:
        return None
    cached = await db.idempotency.find_one({"key": idempotency_key}, {"_id": 0})
    return cached.get("response") if cached else None


async def _idempotency_store(idempotency_key: str, response: dict) -> None:
    if not idempotency_key:
        return
    await db.idempotency.update_one(
        {"key": idempotency_key},
        {"$set": {"key": idempotency_key, "response": response, "created_at": _now_iso()}},
        upsert=True,
    )


# ---------- Tierra OS: full snapshot for single-call sync ----------
@api.get("/tierra/sync-snapshot")
async def tierra_sync_snapshot(
    days_ahead: int = 7,
    _: bool = Depends(_require_tierra_token),
):
    """Single-call sync snapshot for Tierra OS dashboard.

    Returns:
      - reservations: from today to today+days_ahead (default 7)
      - tables: all tables with current status
      - open_orders: dine-in orders not yet completed
      - menu_unavailable: list of menu items currently disabled
      - slot_config: capacity rules
      - server_time: ISO timestamp
    """
    from datetime import datetime, timedelta, timezone as tz
    today = datetime.now(tz.utc).date()
    end = today + timedelta(days=max(1, min(days_ahead, 60)))
    today_s, end_s = today.isoformat(), end.isoformat()

    reservations = await db.reservations.find(
        {"date": {"$gte": today_s, "$lte": end_s},
         "status": {"$nin": ["cancelled", "no_show"]}},
        {"_id": 0},
    ).sort("date", 1).to_list(2000)

    tables = await db.tables.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    # Add OS-style alias 'codice' for backward compat with Tierra OS UI
    for t in tables:
        t["codice"] = t.get("code")

    open_orders = await db.orders.find(
        {"service_type": "tavolo", "status": {"$in": ["open", "preparing", "ready"]}},
        {"_id": 0},
    ).sort("created_at", -1).to_list(500)

    unavailable = await db.menu_items.find(
        {"available": False},
        {"_id": 0, "id": 1, "name": 1, "category_slug": 1, "available": 1},
    ).to_list(500)

    sc = await db.slot_config.find_one({"id": "default"}, {"_id": 0}) or SlotConfig().model_dump()

    return {
        "ok": True,
        "server_time": _now_iso(),
        "range": {"from": today_s, "to": end_s},
        "reservations": reservations,
        "tables": tables,
        "open_orders": open_orders,
        "menu_unavailable": unavailable,
        "slot_config": sc,
    }


@api.get("/tierra/orders")
async def tierra_list_orders(
    since: Optional[str] = None,
    status: Optional[str] = None,
    service_type: Optional[str] = None,
    table: Optional[str] = None,            # OS-style alias for table_code
    table_code: Optional[str] = None,
    limit: int = 200,
    _: bool = Depends(_require_tierra_token),
):
    """Pull orders for Tierra OS (poll fallback when outgoing push isn't available).

    Filters:
      - since: ISO timestamp (created_at >= since)
      - status: comma-separated list of statuses
      - service_type: delivery | asporto | preordine | tavolo (also "table"/"takeaway" accepted)
      - table / table_code: e.g. "E3" (OS uses ?table=E3)
    """
    from models import _normalize_service_type
    q: dict = {}
    if since:
        q["created_at"] = {"$gte": since}
    if status:
        q["status"] = {"$in": [s.strip() for s in status.split(",") if s.strip()]}
    if service_type:
        q["service_type"] = _normalize_service_type(service_type)
    tc = table_code or table
    if tc:
        q["table_code"] = tc
    rows = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(max(1, min(limit, 500)))
    return {"ok": True, "count": len(rows), "items": rows, "orders": rows}


@api.patch("/tierra/orders/{order_id}")
async def tierra_update_order(
    order_id: str,
    payload: dict,
    background: BackgroundTasks,
    _: bool = Depends(_require_tierra_token),
):
    """OS endpoint: update order status / payment_status / paid_at / notes.

    Body example: {"status":"paid","payment_status":"paid","paid_at":"2026-04-29T20:35Z"}
    Triggers outgoing push back to OS for echo confirmation.
    """
    allowed_keys = {"status", "payment_status", "paid_at", "notes", "table_code"}
    updates = {k: v for k, v in (payload or {}).items() if k in allowed_keys and v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    updates["updated_at"] = _now_iso()
    res = await db.orders.update_one({"id": order_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
    background.add_task(_push_order_update_safe, doc)
    return {"ok": True, "order": doc}


async def _push_order_update_safe(order_doc: dict) -> None:
    try:
        await tierra_os_sync.push_order_update(order_doc)
    except Exception as e:
        logger.warning("Order push update failed for %s: %s", order_doc.get("id"), e)


@api.post("/tierra/sync/replay")
async def tierra_replay_push(
    body: dict,
    _: bool = Depends(_require_tierra_token),
):
    """Manually re-trigger a push to Tierra OS for a reservation or order
    (useful when OS was down and we need to re-sync).

    Body: {"type": "reservation"|"order", "id": "<uuid>"}
    """
    typ = body.get("type")
    rid = body.get("id")
    if typ not in ("reservation", "order") or not rid:
        raise HTTPException(status_code=400, detail="Required: type (reservation|order) + id")
    if typ == "reservation":
        doc = await db.reservations.find_one({"id": rid}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Reservation not found")
        record_id = await tierra_os_sync.push_reservation_create(doc)
        if record_id:
            await db.reservations.update_one(
                {"id": rid}, {"$set": {"booking_id": record_id, "os_record_id": record_id}},
            )
        return {"ok": True, "type": typ, "id": rid, "os_record_id": record_id}
    doc = await db.orders.find_one({"id": rid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    await tierra_os_sync.push_order_create(doc)
    return {"ok": True, "type": typ, "id": rid}


@api.on_event("startup")
async def _ensure_idempotency_ttl():
    try:
        await db.idempotency.create_index(
            "created_at", expireAfterSeconds=86400, name="idem_ttl",
        )
    except Exception as e:
        logger.warning("Could not create idempotency TTL index: %s", e)


# Include + CORS
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)