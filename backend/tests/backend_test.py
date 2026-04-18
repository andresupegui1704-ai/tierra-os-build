"""Backend test suite for Tierra Organic Bistro (pytest)."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tierra-bistro-menu.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@tierraorganic.it"
ADMIN_PASSWORD = "Tierra2026!"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data and isinstance(data["access_token"], str) and len(data["access_token"]) > 20
    assert data.get("token_type") == "bearer"
    return data["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Health & Info ----------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_info(self, session):
        r = session.get(f"{API}/info")
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Tierra Organic Bistro"
        assert "Via Tirso" in data["address"]
        assert data["whatsapp"] == "+393479915420"
        assert data["email"] == "tierraorganicbistrot@gmail.com"


# ---------- Menu ----------
class TestMenu:
    def test_categories_count_and_slugs(self, session):
        r = session.get(f"{API}/menu/categories")
        assert r.status_code == 200
        cats = r.json()
        assert len(cats) == 6
        slugs = {c["slug"] for c in cats}
        assert slugs == {"colazione", "pranzo-cena", "aperitierra", "caffetteria", "bevande", "contorno"}
        # No _id leak
        for c in cats:
            assert "_id" not in c

    def test_items_count_28(self, session):
        r = session.get(f"{API}/menu/items")
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 28
        for it in items:
            assert "_id" not in it
            assert "id" in it and "name" in it and "price" in it

    def test_items_filter_by_category(self, session):
        r = session.get(f"{API}/menu/items", params={"category": "colazione"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        assert all(i["category_slug"] == "colazione" for i in items)


# ---------- Admin Auth ----------
class TestAdminAuth:
    def test_login_success(self, session):
        r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_login_invalid(self, session):
        r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong-password"})
        assert r.status_code == 401

    def test_admin_me_requires_token(self, session):
        r = session.get(f"{API}/admin/me")
        assert r.status_code == 401

    def test_admin_me_with_token(self, session, admin_headers):
        r = session.get(f"{API}/admin/me", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# ---------- Admin Menu Management ----------
class TestAdminMenuManagement:
    def test_toggle_requires_auth(self, session):
        items = session.get(f"{API}/menu/items").json()
        item_id = items[0]["id"]
        r = session.post(f"{API}/admin/menu/items/{item_id}/toggle")
        assert r.status_code == 401

    def test_toggle_flips_availability(self, session, admin_headers):
        items = session.get(f"{API}/menu/items").json()
        item = items[-1]  # use last item (likely Slides)
        item_id = item["id"]
        original = item["available"]

        r1 = session.post(f"{API}/admin/menu/items/{item_id}/toggle", headers=admin_headers)
        assert r1.status_code == 200
        toggled = r1.json()
        assert toggled["available"] == (not original)
        assert "_id" not in toggled

        # Flip back
        r2 = session.post(f"{API}/admin/menu/items/{item_id}/toggle", headers=admin_headers)
        assert r2.status_code == 200
        assert r2.json()["available"] == original

    def test_patch_price(self, session, admin_headers):
        items = session.get(f"{API}/menu/items").json()
        target = next(i for i in items if i["name"] == "Caffè")
        item_id = target["id"]
        original_price = target["price"]

        new_price = round(original_price + 0.01, 2)
        r = session.patch(
            f"{API}/admin/menu/items/{item_id}",
            json={"price": new_price},
            headers=admin_headers,
        )
        assert r.status_code == 200, r.text
        assert r.json()["price"] == new_price

        # Verify persisted via GET
        got = session.get(f"{API}/menu/items", params={"category": "caffetteria"}).json()
        persisted = next(i for i in got if i["id"] == item_id)
        assert persisted["price"] == new_price

        # Revert
        r2 = session.patch(
            f"{API}/admin/menu/items/{item_id}",
            json={"price": original_price},
            headers=admin_headers,
        )
        assert r2.status_code == 200


# ---------- Orders ----------
class TestOrders:
    def _pick_items(self, session, n=2):
        items = session.get(f"{API}/menu/items").json()
        # Prefer items without required customizations to keep tests simple
        simple = [i for i in items if i.get("available", True) and not any(
            g.get("required") for g in (i.get("customization_groups") or [])
        )]
        return simple[:n]

    def test_create_delivery_requires_address(self, session):
        items = self._pick_items(session)
        payload = {
            "service_type": "delivery",
            "items": [{"item_id": items[0]["id"], "name": items[0]["name"], "price": items[0]["price"], "quantity": 1}],
            "customer_name": "TEST_User",
            "customer_phone": "+391234567890",
            "customer_email": "test_delivery@example.com",
            "origin_url": BASE_URL,
        }
        r = session.post(f"{API}/orders", json=payload)
        assert r.status_code == 400
        assert "consegna" in r.json().get("detail", "").lower() or "delivery" in r.json().get("detail", "").lower()

    def test_create_delivery_with_address_computes_total(self, session):
        picks = self._pick_items(session, 2)
        payload = {
            "service_type": "delivery",
            "items": [
                {"item_id": picks[0]["id"], "name": picks[0]["name"], "price": 0.01, "quantity": 2},
                {"item_id": picks[1]["id"], "name": picks[1]["name"], "price": 99.99, "quantity": 1},
            ],
            "customer_name": "TEST_User",
            "customer_phone": "+391234567890",
            "customer_email": "test_deliv2@example.com",
            "delivery_address": "Via Test 1, Roma",
            "origin_url": BASE_URL,
        }
        r = session.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        order = r.json()
        # server should use db prices, not client prices
        expected_subtotal = round(picks[0]["price"] * 2 + picks[1]["price"] * 1, 2)
        assert order["subtotal"] == expected_subtotal
        assert order["total"] == round(expected_subtotal + 3.50, 2)
        assert order["service_type"] == "delivery"
        assert "_id" not in order
        assert order["status"] == "pending_payment"

    def test_asporto_no_delivery_fee(self, session):
        picks = self._pick_items(session, 1)
        payload = {
            "service_type": "asporto",
            "items": [{"item_id": picks[0]["id"], "name": picks[0]["name"], "price": picks[0]["price"], "quantity": 1}],
            "customer_name": "TEST_Asporto",
            "customer_phone": "+391234567890",
            "customer_email": "test_asporto@example.com",
            "origin_url": BASE_URL,
        }
        r = session.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["subtotal"] == order["total"]

    def test_rejects_unavailable_item(self, session, admin_headers):
        picks = self._pick_items(session, 1)
        item_id = picks[0]["id"]
        # Turn off
        session.post(f"{API}/admin/menu/items/{item_id}/toggle", headers=admin_headers)
        try:
            payload = {
                "service_type": "asporto",
                "items": [{"item_id": item_id, "name": picks[0]["name"], "price": picks[0]["price"], "quantity": 1}],
                "customer_name": "TEST_NA",
                "customer_phone": "+391234567890",
                "customer_email": "test_na@example.com",
                "origin_url": BASE_URL,
            }
            r = session.post(f"{API}/orders", json=payload)
            assert r.status_code == 400
            assert "esaurito" in r.json().get("detail", "").lower() or "non disponibile" in r.json().get("detail", "").lower()
        finally:
            # Restore availability
            session.post(f"{API}/admin/menu/items/{item_id}/toggle", headers=admin_headers)

    def test_get_order_persists(self, session):
        picks = self._pick_items(session, 1)
        payload = {
            "service_type": "asporto",
            "items": [{"item_id": picks[0]["id"], "name": picks[0]["name"], "price": picks[0]["price"], "quantity": 1}],
            "customer_name": "TEST_Persist",
            "customer_phone": "+391234567890",
            "customer_email": "persist@example.com",
            "origin_url": BASE_URL,
        }
        order = session.post(f"{API}/orders", json=payload).json()
        r = session.get(f"{API}/orders/{order['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == order["id"]


# ---------- Payments ----------
class TestPayments:
    def test_checkout_creates_session_and_tx(self, session):
        # Create order first
        items = session.get(f"{API}/menu/items").json()
        available = [i for i in items if i.get("available", True)]
        pick = available[0]
        order_payload = {
            "service_type": "asporto",
            "items": [{"item_id": pick["id"], "name": pick["name"], "price": pick["price"], "quantity": 1}],
            "customer_name": "TEST_Pay",
            "customer_phone": "+391234567890",
            "customer_email": "pay@example.com",
            "origin_url": BASE_URL,
        }
        order = session.post(f"{API}/orders", json=order_payload).json()

        r = session.post(f"{API}/payments/checkout", json={"order_id": order["id"], "origin_url": BASE_URL})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("url", "").startswith("http")
        assert data.get("session_id")
        TestPayments.session_id = data["session_id"]

    def test_payment_status_fresh_session(self, session):
        sid = getattr(TestPayments, "session_id", None)
        if not sid:
            pytest.skip("No session id from previous test")
        r = session.get(f"{API}/payments/status/{sid}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "status" in data
        assert "payment_status" in data
        # Fresh: payment_status likely 'unpaid' or 'open'
        assert data["payment_status"] in {"unpaid", "open", "paid", "no_payment_required"}

    def test_payment_status_unknown_session(self, session):
        r = session.get(f"{API}/payments/status/cs_unknown_{uuid.uuid4().hex}")
        assert r.status_code == 404


# ---------- Reservations ----------
class TestReservations:
    def test_create_valid(self, session):
        payload = {
            "customer_name": "TEST_Res",
            "customer_phone": "+391234567890",
            "customer_email": "res@example.com",
            "date": "2026-02-15",
            "time": "20:00",
            "guests": 4,
            "notes": "Tavolo vicino finestra",
        }
        r = session.post(f"{API}/reservations", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["guests"] == 4
        assert data["status"] == "pending"
        assert "_id" not in data

    def test_invalid_guests_zero(self, session):
        payload = {
            "customer_name": "TEST_Res",
            "customer_phone": "+391234567890",
            "customer_email": "res2@example.com",
            "date": "2026-02-15",
            "time": "20:00",
            "guests": 0,
        }
        r = session.post(f"{API}/reservations", json=payload)
        assert r.status_code == 400

    def test_invalid_guests_high(self, session):
        payload = {
            "customer_name": "TEST_Res",
            "customer_phone": "+391234567890",
            "customer_email": "res3@example.com",
            "date": "2026-02-15",
            "time": "20:00",
            "guests": 25,
        }
        r = session.post(f"{API}/reservations", json=payload)
        assert r.status_code == 400


# ---------- Admin Listings ----------
class TestAdminListings:
    def test_orders_requires_auth(self, session):
        r = session.get(f"{API}/admin/orders")
        assert r.status_code == 401

    def test_orders_with_auth(self, session, admin_headers):
        r = session.get(f"{API}/admin/orders", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for o in data:
            assert "_id" not in o

    def test_reservations_requires_auth(self, session):
        r = session.get(f"{API}/admin/reservations")
        assert r.status_code == 401

    def test_reservations_with_auth(self, session, admin_headers):
        r = session.get(f"{API}/admin/reservations", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for o in data:
            assert "_id" not in o
