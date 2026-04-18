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
import uuid
from typing import List, Optional

from models import (
    MenuCategory, MenuCategoryCreate, MenuCategoryUpdate,
    MenuItem, MenuItemCreate, MenuItemUpdate, CustomizationGroup,
    OrderCreate, Order, ReservationCreate, Reservation,
    CheckoutRequest, PaymentTransaction, AdminLogin, AdminToken,
    _now_iso,
)
from seed_data import CATEGORIES, ITEMS
from customizations import bowl_groups, secondo_groups, CUSTOMIZATION_VERSION
from email_service import send_order_confirmation, send_reservation_confirmation
from auth import verify_admin, create_token, require_admin
import storage as obj_storage
import escpos
import image_utils

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
        "name": os.environ.get("RESTAURANT_NAME", "Tierra Organic Bistro"),
        "address": os.environ.get("RESTAURANT_ADDRESS", ""),
        "whatsapp": os.environ.get("RESTAURANT_WHATSAPP", ""),
        "email": os.environ.get("RESTAURANT_EMAIL", ""),
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
async def create_order(payload: OrderCreate, request: Request):
    # Validate items against DB and recompute total on server
    item_ids = [i.item_id for i in payload.items]
    db_items = await db.menu_items.find({"id": {"$in": item_ids}}, {"_id": 0}).to_list(500)
    db_map = {i["id"]: i for i in db_items}
    subtotal = 0.0
    validated_items = []
    for li in payload.items:
        dbi = db_map.get(li.item_id)
        if not dbi:
            raise HTTPException(status_code=400, detail=f"Piatto non disponibile: {li.name}")
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

    # Delivery fee (simple, server-side)
    delivery_fee = 3.50 if payload.service_type == "delivery" else 0.0
    total = round(subtotal + delivery_fee, 2)

    order = Order(
        service_type=payload.service_type,
        items=validated_items,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        delivery_address=payload.delivery_address,
        scheduled_time=payload.scheduled_time,
        notes=payload.notes,
        subtotal=round(subtotal, 2),
        total=total,
        marketing_consent=bool(payload.marketing_consent),
        consent_date=_now_iso() if payload.marketing_consent else None,
    )
    await db.orders.insert_one(order.model_dump())

    # Upsert marketing subscriber if opted-in
    if payload.marketing_consent:
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


# ---------- Reservations ----------
@api.post("/reservations", response_model=Reservation)
async def create_reservation(payload: ReservationCreate, background: BackgroundTasks):
    if payload.guests < 1 or payload.guests > 20:
        raise HTTPException(status_code=400, detail="Numero ospiti non valido (1-20)")
    res = Reservation(**payload.model_dump())
    await db.reservations.insert_one(res.model_dump())
    background.add_task(send_reservation_confirmation, res.model_dump())
    return res


@api.get("/admin/reservations", response_model=List[Reservation])
async def admin_list_reservations(_: str = Depends(require_admin)):
    rows = await db.reservations.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@api.post("/admin/reservations/{res_id}/status")
async def admin_set_res_status(res_id: str, status: str, _: str = Depends(require_admin)):
    allowed = {"pending", "confirmed", "cancelled"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail="Stato non valido")
    r = await db.reservations.update_one({"id": res_id}, {"$set": {"status": status}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    return {"ok": True}


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
    """Print agent polls this. Returns orders queued for printing with ESC/POS payload."""
    jobs = await db.print_queue.find({"status": "queued"}, {"_id": 0}).sort("created_at", 1).to_list(max(1, min(limit, 20)))
    output = []
    for j in jobs:
        order = await db.orders.find_one({"id": j["order_id"]}, {"_id": 0})
        if not order:
            continue
        output.append({
            "job_id": j["id"],
            "order_id": j["order_id"],
            "created_at": j["created_at"],
            "escpos_base64": escpos.encode_job(order),
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


# Include + CORS
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
