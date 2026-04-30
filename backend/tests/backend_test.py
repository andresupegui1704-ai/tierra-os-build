"""CleanMate backend API tests."""
import os
import io
import base64
import pytest
import requests
from PIL import Image, ImageDraw

BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") + "/api"


def _img_png(color=(200, 100, 50), draw_shapes=True, size=(128, 128)) -> str:
    img = Image.new("RGB", size, color)
    if draw_shapes:
        d = ImageDraw.Draw(img)
        d.rectangle([10, 10, 60, 60], fill=(20, 20, 20))
        d.ellipse([60, 60, 120, 120], fill=(255, 255, 255))
        d.line([0, 0, size[0], size[1]], fill=(0, 200, 0), width=3)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ====== BASIC ======
def test_root(client):
    r = client.get(f"{BASE}/")
    assert r.status_code == 200
    assert "CleanMate" in r.json().get("message", "")


def test_stats_initial(client):
    # reset then fetch
    client.post(f"{BASE}/stats/reset", json={"user_id": "demo"})
    r = client.get(f"{BASE}/stats?user_id=demo")
    assert r.status_code == 200
    j = r.json()
    assert j["photos_cleaned"] == 0
    assert j["space_saved_mb"] == 0.0
    assert j["emails_cleaned"] == 0


def test_gmail_status(client):
    r = client.get(f"{BASE}/gmail/status")
    assert r.status_code == 200
    j = r.json()
    assert j["connected"] is False
    assert j["demo_mode"] is True
    assert "_id" not in j


# ====== EMAILS ======
def test_emails_scan(client):
    # ensure restored
    client.post(f"{BASE}/emails/reset", json={"user_id": "demo"})
    r = client.get(f"{BASE}/emails/scan?user_id=demo")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 18
    cats = {e["category"] for e in data}
    assert {"spam", "promotions", "newsletters", "social", "useful"} <= cats
    for e in data:
        assert "_id" not in e
        assert e["id"].startswith("demo-")


def test_emails_delete_and_persist(client):
    client.post(f"{BASE}/emails/reset", json={"user_id": "demo"})
    r = client.post(f"{BASE}/emails/delete", json={"user_id": "demo", "email_ids": ["demo-0", "demo-1"]})
    assert r.status_code == 200
    j = r.json()
    assert j["deleted"] == 2
    assert j["size_saved_kb"] > 0
    # verify persistence
    r2 = client.get(f"{BASE}/emails/scan?user_id=demo")
    ids = [e["id"] for e in r2.json()]
    assert "demo-0" not in ids
    assert "demo-1" not in ids
    assert len(ids) == 16


def test_emails_delete_empty_ids(client):
    r = client.post(f"{BASE}/emails/delete", json={"user_id": "demo", "email_ids": []})
    assert r.status_code == 400


def test_emails_reset_restores(client):
    # delete then reset
    client.post(f"{BASE}/emails/delete", json={"user_id": "demo", "email_ids": ["demo-3"]})
    r = client.post(f"{BASE}/emails/reset", json={"user_id": "demo"})
    assert r.status_code == 200
    assert r.json()["reset"] is True
    r2 = client.get(f"{BASE}/emails/scan?user_id=demo")
    assert len(r2.json()) == 18


# ====== PHOTOS ======
def test_photos_albums_initial(client):
    r = client.get(f"{BASE}/photos/albums")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_photos_analyze(client):
    b64 = _img_png(color=(30, 120, 200))
    r = client.post(f"{BASE}/photos/analyze", json={"image_base64": b64, "photo_id": "TEST_p1"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["photo_id"] == "TEST_p1"
    assert j["category"]
    assert j["content_hash"]
    assert len(j["content_hash"]) == 16
    assert 0.0 <= j["quality_score"] <= 1.0
    assert isinstance(j["features"], list)
    assert "_id" not in j


def test_photos_batch_and_find_exact(client):
    b64a = _img_png(color=(30, 120, 200))
    b64b = _img_png(color=(200, 30, 120))
    payload = {
        "photos": [
            {"image_base64": b64a, "photo_id": "TEST_dup1"},
            {"image_base64": b64a, "photo_id": "TEST_dup2"},  # exact dup
            {"image_base64": b64b, "photo_id": "TEST_diff"},
        ]
    }
    r = client.post(f"{BASE}/photos/batch-analyze", json=payload)
    assert r.status_code == 200, r.text
    analyses = r.json()
    assert len(analyses) == 3
    # Same base64 must yield same content_hash
    h1 = next(a for a in analyses if a["photo_id"] == "TEST_dup1")["content_hash"]
    h2 = next(a for a in analyses if a["photo_id"] == "TEST_dup2")["content_hash"]
    assert h1 == h2

    r2 = client.post(f"{BASE}/photos/find-duplicates", json={"analyses": analyses})
    assert r2.status_code == 200
    groups = r2.json()
    exact = [g for g in groups if g["type"] == "exact"]
    assert len(exact) >= 1
    assert set(exact[0]["photo_ids"]) == {"TEST_dup1", "TEST_dup2"}


def test_photos_batch_size_limit(client):
    b64 = _img_png()
    payload = {"photos": [{"image_base64": b64, "photo_id": f"TEST_x{i}"} for i in range(11)]}
    r = client.post(f"{BASE}/photos/batch-analyze", json=payload)
    assert r.status_code == 400


def test_find_duplicates_similar():
    # pure logic via API: craft analyses sharing category+features
    analyses = [
        {"photo_id": "TEST_s1", "category": "food", "label": "A", "description": "",
         "content_hash": "hash_a_001", "quality_score": 0.7, "features": ["pasta", "plate", "red"]},
        {"photo_id": "TEST_s2", "category": "food", "label": "B", "description": "",
         "content_hash": "hash_b_002", "quality_score": 0.8, "features": ["pasta", "plate", "tomato"]},
        {"photo_id": "TEST_s3", "category": "food", "label": "C", "description": "",
         "content_hash": "hash_c_003", "quality_score": 0.5, "features": ["pasta", "plate", "green"]},
    ]
    r = requests.post(f"{BASE}/photos/find-duplicates", json={"analyses": analyses})
    assert r.status_code == 200
    groups = r.json()
    similar = [g for g in groups if g["type"] == "similar"]
    assert len(similar) >= 1
    assert set(similar[0]["photo_ids"]) == {"TEST_s1", "TEST_s2", "TEST_s3"}
    assert similar[0]["category"] == "food"


# ====== STATS ======
def test_record_photo_cleanup_and_reset(client):
    client.post(f"{BASE}/stats/reset", json={"user_id": "demo"})
    r = client.post(f"{BASE}/stats/record-photo-cleanup",
                    json={"user_id": "demo", "photos_deleted": 5, "space_mb": 12.5})
    assert r.status_code == 200
    r2 = client.get(f"{BASE}/stats?user_id=demo")
    j = r2.json()
    assert j["photos_cleaned"] == 5
    assert abs(j["space_saved_mb"] - 12.5) < 0.001
    assert j["last_scan"] is not None

    # reset
    r3 = client.post(f"{BASE}/stats/reset", json={"user_id": "demo"})
    assert r3.status_code == 200
    r4 = client.get(f"{BASE}/stats?user_id=demo")
    assert r4.json()["photos_cleaned"] == 0



# ====== NEW: DEMO-SCAN + BY-CATEGORY ======
def test_photos_demo_scan(client):
    r = client.post(f"{BASE}/photos/demo-scan", json={})
    assert r.status_code == 200, r.text
    j = r.json()
    assert "photos" in j and "analyses" in j and "groups" in j
    assert len(j["photos"]) == 7
    assert len(j["analyses"]) == 7
    # exactly 1 exact group (selfies) + 2 similar groups (food, documents)
    exact = [g for g in j["groups"] if g["type"] == "exact"]
    similar = [g for g in j["groups"] if g["type"] == "similar"]
    assert len(exact) == 1
    assert exact[0]["category"] == "selfie"
    assert len(similar) == 2
    sim_cats = {g["category"] for g in similar}
    assert sim_cats == {"food", "document"}
    for p in j["photos"]:
        assert p["url"].startswith("http")
        assert "_id" not in p
    for a in j["analyses"]:
        assert "_id" not in a
        assert a["photo_id"].startswith("demo-")


def test_photos_by_category_selfie(client):
    # ensure seeded
    client.post(f"{BASE}/photos/demo-scan", json={})
    r = client.get(f"{BASE}/photos/by-category/selfie")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    ids = {d["photo_id"] for d in data}
    assert {"demo-dup-1", "demo-dup-2"} <= ids
    for d in data:
        assert "_id" not in d
        assert d["category"] == "selfie"
        assert d["url"] and d["url"].startswith("http")
        assert "label" in d and "features" in d and "content_hash" in d
        assert "quality_score" in d and "description" in d


def test_photos_by_category_food(client):
    client.post(f"{BASE}/photos/demo-scan", json={})
    r = client.get(f"{BASE}/photos/by-category/food")
    assert r.status_code == 200
    data = r.json()
    ids = {d["photo_id"] for d in data}
    assert {"demo-food-1", "demo-food-2"} <= ids
    for d in data:
        assert d["category"] == "food"
        assert d["url"] and "unsplash" in d["url"]
        assert "_id" not in d


def test_photos_by_category_nonexistent(client):
    r = client.get(f"{BASE}/photos/by-category/nonexistent_xyz")
    assert r.status_code == 200
    assert r.json() == []
