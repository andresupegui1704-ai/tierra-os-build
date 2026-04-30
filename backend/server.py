from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hashlib
import random
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============ MODELS ============
class PhotoAnalyzeRequest(BaseModel):
    image_base64: str
    photo_id: Optional[str] = None


class PhotoAnalyzeResponse(BaseModel):
    photo_id: str
    category: str
    label: str
    description: str
    content_hash: str
    quality_score: float  # 0-1, higher = better to keep
    features: List[str]


class PhotoBatchRequest(BaseModel):
    photos: List[PhotoAnalyzeRequest]


class DuplicateGroup(BaseModel):
    id: str
    type: str  # "exact" | "similar"
    category: str
    photo_ids: List[str]
    recommended_keep: str
    space_mb: float


class FindDuplicatesRequest(BaseModel):
    analyses: List[PhotoAnalyzeResponse]


class EmailItem(BaseModel):
    id: str
    sender: str
    sender_email: str
    subject: str
    preview: str
    category: str  # spam, promotions, newsletters, social, useful
    received_at: str
    is_read: bool
    size_kb: int


class ScanSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_photos: int = 0
    duplicates_found: int = 0
    similar_found: int = 0
    space_reclaimable_mb: float = 0.0
    emails_scanned: int = 0
    emails_to_clean: int = 0


class UserStats(BaseModel):
    photos_cleaned: int = 0
    space_saved_mb: float = 0.0
    emails_cleaned: int = 0
    albums_organized: int = 0
    last_scan: Optional[str] = None


# ============ DEMO DATA ============
DEMO_EMAILS = [
    # SPAM
    {"sender": "Lottery Winner", "sender_email": "winner@suspicious.com", "subject": "URGENT: You won $1,000,000!", "preview": "Congratulations! Click here to claim your prize...", "category": "spam", "size_kb": 45},
    {"sender": "Prince Ahmed", "sender_email": "prince@nigeria123.net", "subject": "Confidential Business Proposal", "preview": "Dear friend, I have $5M to transfer...", "category": "spam", "size_kb": 32},
    {"sender": "Pharma Deals", "sender_email": "noreply@pharmax.biz", "subject": "Best prices on medications 80% off", "preview": "Limited time offer on all products...", "category": "spam", "size_kb": 28},
    {"sender": "Crypto Scam", "sender_email": "support@btc-invest.fake", "subject": "Triple your investment in 24h", "preview": "Guaranteed returns on Bitcoin...", "category": "spam", "size_kb": 22},
    # PROMOTIONS
    {"sender": "Zalando", "sender_email": "noreply@zalando.com", "subject": "-50% solo oggi sulle sneakers", "preview": "Ultimo giorno per approfittare dei saldi...", "category": "promotions", "size_kb": 180},
    {"sender": "Amazon", "sender_email": "promo@amazon.it", "subject": "Offerte lampo per te", "preview": "Prime Day anteprima - solo per clienti Prime...", "category": "promotions", "size_kb": 215},
    {"sender": "IKEA", "sender_email": "newsletter@ikea.com", "subject": "Nuove idee per il tuo salotto", "preview": "Scopri la nuova collezione 2026...", "category": "promotions", "size_kb": 340},
    {"sender": "Booking.com", "sender_email": "promotions@booking.com", "subject": "Weekend a Roma da 49€", "preview": "Prenota ora le migliori offerte...", "category": "promotions", "size_kb": 125},
    {"sender": "H&M", "sender_email": "news@hm.com", "subject": "Nuova collezione primavera", "preview": "Scopri i nuovi arrivi...", "category": "promotions", "size_kb": 220},
    # NEWSLETTERS
    {"sender": "Medium Daily", "sender_email": "noreply@medium.com", "subject": "Your daily digest - Feb 12", "preview": "Top stories in Tech and Design...", "category": "newsletters", "size_kb": 95},
    {"sender": "Il Post", "sender_email": "newsletter@ilpost.it", "subject": "Il Post della sera", "preview": "Le notizie principali di oggi...", "category": "newsletters", "size_kb": 68},
    {"sender": "TechCrunch", "sender_email": "digest@techcrunch.com", "subject": "This week in tech", "preview": "AI startups raising record funding...", "category": "newsletters", "size_kb": 78},
    {"sender": "Substack", "sender_email": "noreply@substack.com", "subject": "5 new posts from your subscriptions", "preview": "From writers you follow...", "category": "newsletters", "size_kb": 55},
    # SOCIAL
    {"sender": "LinkedIn", "sender_email": "notify@linkedin.com", "subject": "Marco viewed your profile", "preview": "See who's interested in your profile...", "category": "social", "size_kb": 35},
    {"sender": "Instagram", "sender_email": "no-reply@mail.instagram.com", "subject": "New followers this week", "preview": "3 people started following you...", "category": "social", "size_kb": 42},
    {"sender": "Facebook", "sender_email": "notification@facebook.com", "subject": "You have 12 new notifications", "preview": "See what's happening with your friends...", "category": "social", "size_kb": 38},
    # USEFUL (shouldn't be deleted)
    {"sender": "Banca Intesa", "sender_email": "notifiche@intesasanpaolo.com", "subject": "Estratto conto disponibile", "preview": "Il tuo estratto conto di gennaio è pronto...", "category": "useful", "size_kb": 15},
    {"sender": "Dott. Rossi", "sender_email": "studio.rossi@medico.it", "subject": "Referti esami del sangue", "preview": "In allegato i risultati delle analisi...", "category": "useful", "size_kb": 1200},
]


def seed_demo_emails():
    emails = []
    now = datetime.now(timezone.utc)
    for i, e in enumerate(DEMO_EMAILS):
        emails.append(EmailItem(
            id=f"demo-{i}",
            sender=e["sender"],
            sender_email=e["sender_email"],
            subject=e["subject"],
            preview=e["preview"],
            category=e["category"],
            received_at=(now).isoformat(),
            is_read=random.random() > 0.3,
            size_kb=e["size_kb"],
        ))
    return emails


# ============ AI HELPERS ============
async def analyze_image_with_ai(image_base64: str, photo_id: str) -> PhotoAnalyzeResponse:
    """Use Gemini vision to categorize and describe a photo."""
    # Compute content hash
    content_hash = hashlib.sha256(image_base64.encode()).hexdigest()[:16]

    if not EMERGENT_LLM_KEY:
        # Fallback without AI
        return PhotoAnalyzeResponse(
            photo_id=photo_id,
            category="other",
            label="Photo",
            description="",
            content_hash=content_hash,
            quality_score=0.5,
            features=[],
        )

    system = (
        "You are an image classifier for a photo cleaner app. "
        "Given an image, return a JSON object with keys: "
        "category (one of: screenshot, selfie, document, food, pet, landscape, people, receipt, meme, blurry, other), "
        "label (2-4 word title), "
        "description (one concise sentence), "
        "quality_score (0.0-1.0 where higher means better photo, judge composition/focus/lighting), "
        "features (list of 2-4 short keywords describing main visual elements). "
        "Respond ONLY with valid JSON, no markdown."
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"photo-{photo_id}",
            system_message=system,
        ).with_model("gemini", "gemini-2.5-flash")

        img = ImageContent(image_base64=image_base64)
        msg = UserMessage(
            text="Classify this image and return the JSON as specified.",
            file_contents=[img],
        )
        response = await chat.send_message(msg)

        import json
        # clean response
        text = response.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip("` \n")
        data = json.loads(text)

        return PhotoAnalyzeResponse(
            photo_id=photo_id,
            category=str(data.get("category", "other")).lower(),
            label=str(data.get("label", "Photo"))[:40],
            description=str(data.get("description", ""))[:200],
            content_hash=content_hash,
            quality_score=float(data.get("quality_score", 0.5)),
            features=[str(f)[:30] for f in (data.get("features") or [])][:4],
        )
    except Exception as ex:
        logger.warning(f"AI analysis failed: {ex}")
        return PhotoAnalyzeResponse(
            photo_id=photo_id,
            category="other",
            label="Photo",
            description="",
            content_hash=content_hash,
            quality_score=0.5,
            features=[],
        )


# ============ ROUTES ============
@api_router.get("/")
async def root():
    return {"message": "CleanMate API", "version": "1.0.0"}


@api_router.post("/photos/analyze", response_model=PhotoAnalyzeResponse)
async def analyze_photo(req: PhotoAnalyzeRequest):
    pid = req.photo_id or str(uuid.uuid4())
    result = await analyze_image_with_ai(req.image_base64, pid)
    # Cache in DB
    await db.photo_analyses.update_one(
        {"photo_id": pid},
        {"$set": result.dict()},
        upsert=True,
    )
    return result


@api_router.post("/photos/batch-analyze", response_model=List[PhotoAnalyzeResponse])
async def batch_analyze(req: PhotoBatchRequest):
    """Analyze up to 10 photos in parallel."""
    if len(req.photos) > 10:
        raise HTTPException(400, "Max 10 photos per batch")
    tasks = [
        analyze_image_with_ai(p.image_base64, p.photo_id or str(uuid.uuid4()))
        for p in req.photos
    ]
    results = await asyncio.gather(*tasks, return_exceptions=False)
    # Save all
    for r in results:
        await db.photo_analyses.update_one(
            {"photo_id": r.photo_id},
            {"$set": r.dict()},
            upsert=True,
        )
    return results


@api_router.post("/photos/find-duplicates", response_model=List[DuplicateGroup])
async def find_duplicates(req: FindDuplicatesRequest):
    """Group photos by exact hash and by similar category+features."""
    groups: List[DuplicateGroup] = []

    # Exact duplicates by content_hash
    by_hash: Dict[str, List[PhotoAnalyzeResponse]] = {}
    for a in req.analyses:
        by_hash.setdefault(a.content_hash, []).append(a)

    used_ids = set()
    for h, items in by_hash.items():
        if len(items) > 1:
            best = max(items, key=lambda x: x.quality_score)
            groups.append(DuplicateGroup(
                id=str(uuid.uuid4()),
                type="exact",
                category=items[0].category,
                photo_ids=[i.photo_id for i in items],
                recommended_keep=best.photo_id,
                space_mb=round(2.5 * (len(items) - 1), 2),
            ))
            for i in items:
                used_ids.add(i.photo_id)

    # Similar: group by category + shared features (2+ shared)
    remaining = [a for a in req.analyses if a.photo_id not in used_ids]
    buckets: Dict[str, List[PhotoAnalyzeResponse]] = {}
    for a in remaining:
        key = a.category
        buckets.setdefault(key, []).append(a)

    for cat, items in buckets.items():
        if cat == "other" or len(items) < 2:
            continue
        # Cluster by feature overlap
        clusters: List[List[PhotoAnalyzeResponse]] = []
        for item in items:
            placed = False
            for cluster in clusters:
                ref_features = set(cluster[0].features)
                item_features = set(item.features)
                if ref_features and item_features and len(ref_features & item_features) >= 2:
                    cluster.append(item)
                    placed = True
                    break
            if not placed:
                clusters.append([item])
        for cluster in clusters:
            if len(cluster) >= 2:
                best = max(cluster, key=lambda x: x.quality_score)
                groups.append(DuplicateGroup(
                    id=str(uuid.uuid4()),
                    type="similar",
                    category=cat,
                    photo_ids=[i.photo_id for i in cluster],
                    recommended_keep=best.photo_id,
                    space_mb=round(2.0 * (len(cluster) - 1), 2),
                ))

    return groups


@api_router.get("/photos/albums")
async def get_smart_albums():
    """Return albums grouped by category from analyzed photos in DB."""
    pipeline = [
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1},
            "photo_ids": {"$push": "$photo_id"},
        }},
        {"$sort": {"count": -1}},
    ]
    cursor = db.photo_analyses.aggregate(pipeline)
    albums = []
    async for doc in cursor:
        albums.append({
            "category": doc["_id"],
            "count": doc["count"],
            "photo_ids": doc["photo_ids"][:12],
        })
    return albums


# ============ EMAIL ENDPOINTS (DEMO) ============
@api_router.get("/emails/scan", response_model=List[EmailItem])
async def scan_emails(user_id: str = "demo"):
    """Return seeded demo emails (Gmail OAuth not connected yet)."""
    # Load deleted ids
    deleted_doc = await db.deleted_emails.find_one({"user_id": user_id}, {"_id": 0})
    deleted_ids = set(deleted_doc["ids"]) if deleted_doc else set()
    emails = seed_demo_emails()
    return [e for e in emails if e.id not in deleted_ids]


@api_router.post("/emails/delete")
async def delete_emails(payload: Dict):
    user_id = payload.get("user_id", "demo")
    ids: List[str] = payload.get("email_ids", [])
    if not ids:
        raise HTTPException(400, "email_ids required")
    # Compute size saved
    all_emails = seed_demo_emails()
    size_saved = sum(e.size_kb for e in all_emails if e.id in ids)

    await db.deleted_emails.update_one(
        {"user_id": user_id},
        {"$addToSet": {"ids": {"$each": ids}}},
        upsert=True,
    )
    # Update stats
    await db.user_stats.update_one(
        {"user_id": user_id},
        {"$inc": {"emails_cleaned": len(ids), "space_saved_mb": size_saved / 1024.0}},
        upsert=True,
    )
    return {"deleted": len(ids), "size_saved_kb": size_saved}


@api_router.post("/emails/reset")
async def reset_emails(payload: Dict):
    """Undo all email deletions (demo)."""
    user_id = payload.get("user_id", "demo")
    await db.deleted_emails.delete_one({"user_id": user_id})
    return {"reset": True}


# ============ STATS ============
@api_router.get("/stats", response_model=UserStats)
async def get_stats(user_id: str = "demo"):
    doc = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0, "user_id": 0})
    if not doc:
        return UserStats()
    return UserStats(**doc)


@api_router.post("/stats/record-photo-cleanup")
async def record_photo_cleanup(payload: Dict):
    user_id = payload.get("user_id", "demo")
    photos_deleted = int(payload.get("photos_deleted", 0))
    space_mb = float(payload.get("space_mb", 0))
    await db.user_stats.update_one(
        {"user_id": user_id},
        {
            "$inc": {
                "photos_cleaned": photos_deleted,
                "space_saved_mb": space_mb,
            },
            "$set": {"last_scan": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )
    return {"ok": True}


@api_router.post("/stats/reset")
async def reset_stats(payload: Dict):
    user_id = payload.get("user_id", "demo")
    await db.user_stats.delete_one({"user_id": user_id})
    return {"reset": True}


# ============ GMAIL OAUTH PLACEHOLDER ============
@api_router.get("/gmail/status")
async def gmail_status(user_id: str = "demo"):
    doc = await db.gmail_connections.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "connected": bool(doc),
        "email": doc.get("email") if doc else None,
        "demo_mode": True,
        "message": "Demo mode active. Real Gmail OAuth requires Google Cloud credentials.",
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
