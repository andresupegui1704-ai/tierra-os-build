"""Outgoing sync to Tierra OS (Netlify functions: lark-prenotazioni, gcal-prenotazioni, orders).

Fire-and-forget HTTP push. Failures are logged but do not block the user request.
Configured via env vars:
  - TIERRA_OS_BASE_URL          (e.g. https://ostierra.netlify.app)
  - TIERRA_OS_RESERVATIONS_FN   (default: /.netlify/functions/lark-prenotazioni)
  - TIERRA_OS_ORDERS_FN         (default: /.netlify/functions/lark-orders)  -- optional
  - TIERRA_OS_GCAL_FN           (default: /.netlify/functions/gcal-prenotazioni)
  - TIERRA_OS_OUTGOING_TOKEN    (optional shared secret sent as X-Tierra-Source-Token)
  - TIERRA_OS_SYNC_ENABLED      ("true"/"false", default true if BASE_URL set)
"""
from __future__ import annotations

import os
import asyncio
import logging
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

BASE_URL = (os.environ.get("TIERRA_OS_BASE_URL") or "").rstrip("/")
RESERVATIONS_FN = os.environ.get("TIERRA_OS_RESERVATIONS_FN", "/.netlify/functions/lark-prenotazioni")
ORDERS_FN = os.environ.get("TIERRA_OS_ORDERS_FN", "/.netlify/functions/lark-orders")
GCAL_FN = os.environ.get("TIERRA_OS_GCAL_FN", "/.netlify/functions/gcal-prenotazioni")
OUT_TOKEN = os.environ.get("TIERRA_OS_OUTGOING_TOKEN", "")
ENABLED = os.environ.get("TIERRA_OS_SYNC_ENABLED", "true" if BASE_URL else "false").lower() == "true"

_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


def _enabled() -> bool:
    return bool(ENABLED and BASE_URL)


def _headers() -> Dict[str, str]:
    h = {"Content-Type": "application/json"}
    if OUT_TOKEN:
        h["X-Tierra-Source-Token"] = OUT_TOKEN
    return h


async def _post(path: str, body: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not _enabled():
        return None
    url = f"{BASE_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.post(url, json=body, headers=_headers())
            data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {"text": r.text}
            if r.status_code >= 400:
                logger.warning("Tierra OS push %s → HTTP %s body=%s", path, r.status_code, data)
                return None
            logger.info("Tierra OS push %s OK", path)
            return data
    except Exception as e:
        logger.warning("Tierra OS push %s failed: %s", path, e)
        return None


def _reservation_to_lark(res: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize internal reservation doc → Tierra OS Lark fields shape."""
    return {
        "cliente": res.get("customer_name", ""),
        "telefono": res.get("customer_phone", ""),
        "email": res.get("customer_email") or "",
        "data": res.get("date", ""),
        "ora": res.get("time", ""),
        "pax": int(res.get("guests") or 1),
        "tavolo": res.get("table_code") or "",
        "zona": res.get("zone") or "",
        "note": res.get("notes") or "",
        "status": res.get("status", "pending"),
        "source": "tierra_site",
        "site_reservation_id": res.get("id", ""),
        "booking_id": res.get("booking_id") or res.get("id", ""),
    }


# ---------- Reservations ----------
async def push_reservation_create(res: Dict[str, Any]) -> Optional[str]:
    """Push a newly created reservation to Tierra OS (Lark + GCal in parallel via OS)."""
    if not _enabled():
        return None
    body = {"action": "create", "fields": _reservation_to_lark(res)}
    data = await _post(RESERVATIONS_FN, body)
    return (data or {}).get("recordId") if data else None


async def push_reservation_update(res: Dict[str, Any], record_id: Optional[str] = None) -> None:
    if not _enabled():
        return
    body = {
        "action": "update",
        "recordId": record_id or res.get("os_record_id") or "",
        "site_reservation_id": res.get("id", ""),
        "fields": _reservation_to_lark(res),
    }
    await _post(RESERVATIONS_FN, body)


async def push_reservation_cancel(res_id: str, record_id: Optional[str] = None) -> None:
    if not _enabled():
        return
    body = {
        "action": "cancel",
        "recordId": record_id or "",
        "site_reservation_id": res_id,
    }
    await _post(RESERVATIONS_FN, body)


# ---------- Orders ----------
def _order_to_lark(order: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "order_id": order.get("id", ""),
        "service_type": order.get("service_type", ""),
        "table_code": order.get("table_code") or "",
        "customer_name": order.get("customer_name", ""),
        "customer_phone": order.get("customer_phone", ""),
        "customer_email": order.get("customer_email") or "",
        "total": float(order.get("total") or 0),
        "subtotal": float(order.get("subtotal") or 0),
        "items_count": sum(int(i.get("quantity") or 0) for i in order.get("items", [])),
        "items": [
            {
                "name": it.get("name"),
                "qty": int(it.get("quantity") or 0),
                "unit_price": float(it.get("unit_price") or it.get("price") or 0),
                "line_total": float(it.get("line_total") or 0),
            }
            for it in order.get("items", [])
        ],
        "status": order.get("status", ""),
        "payment_status": order.get("payment_status", ""),
        "scheduled_time": order.get("scheduled_time") or "",
        "delivery_address": order.get("delivery_address") or "",
        "notes": order.get("notes") or "",
        "created_at": order.get("created_at", ""),
        "source": "tierra_site",
    }


async def push_order_create(order: Dict[str, Any]) -> None:
    if not _enabled():
        return
    body = {"action": "create", "fields": _order_to_lark(order)}
    await _post(ORDERS_FN, body)


async def push_order_update(order: Dict[str, Any]) -> None:
    if not _enabled():
        return
    body = {"action": "update", "order_id": order.get("id", ""), "fields": _order_to_lark(order)}
    await _post(ORDERS_FN, body)


def fire_and_forget(coro) -> None:
    """Schedule a coroutine without awaiting (used from sync code paths)."""
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(coro)
    except RuntimeError:
        asyncio.run(coro)
