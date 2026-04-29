"""Pydantic models for Tierra Organic Bistro."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Customizations ----------
class CustomizationOption(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    price_delta: float = 0.0
    description: Optional[str] = None
    available: bool = True


class CustomizationGroup(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    description: Optional[str] = None
    selection_type: Literal["single", "multiple"] = "single"
    min_select: int = 0
    max_select: int = 1
    required: bool = False
    options: List[CustomizationOption] = Field(default_factory=list)


# ---------- Menu ----------
class MenuCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    slug: str
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    order: int = 0
    active: bool = True


class MenuCategoryCreate(BaseModel):
    slug: str
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    order: int = 0
    active: bool = True


class MenuCategoryUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    order: Optional[int] = None
    active: Optional[bool] = None


class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    category_slug: str
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    badge: Optional[str] = None  # e.g. "Il più scelto", "Consigliato dallo Chef"
    available: bool = True
    order: int = 0
    customization_groups: List[CustomizationGroup] = Field(default_factory=list)
    is_special: bool = False


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    badge: Optional[str] = None
    available: Optional[bool] = None
    order: Optional[int] = None
    category_slug: Optional[str] = None
    customization_groups: Optional[List[CustomizationGroup]] = None


class MenuItemCreate(BaseModel):
    category_slug: str
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    badge: Optional[str] = None
    available: bool = True
    order: int = 0
    customization_groups: List[CustomizationGroup] = Field(default_factory=list)


# ---------- Orders ----------
ServiceType = Literal["delivery", "asporto", "preordine", "tavolo"]


def _normalize_service_type(v):
    """Accept English aliases used by Tierra OS and map to internal IT values."""
    if not v:
        return v
    s = str(v).strip().lower()
    aliases = {
        "table": "tavolo", "dine-in": "tavolo", "dinein": "tavolo",
        "takeaway": "asporto", "take-away": "asporto", "pickup": "asporto",
        "preorder": "preordine", "pre-order": "preordine",
    }
    return aliases.get(s, s)


class OrderLineItemSelection(BaseModel):
    group_name: str
    option_names: List[str]
    price_delta: float = 0.0


class OrderLineItem(BaseModel):
    item_id: Optional[str] = None  # optional: OS may send only "name"
    name: str
    price: Optional[float] = None
    quantity: int = 1
    customizations: List[OrderLineItemSelection] = Field(default_factory=list)
    unit_price: Optional[float] = None  # price + sum(customization deltas)
    line_total: Optional[float] = None  # unit_price * quantity
    # OS-style aliases
    qty: Optional[int] = None  # alias of quantity

    def model_post_init(self, __context):
        if self.qty and not self.quantity:
            object.__setattr__(self, "quantity", int(self.qty))


class OrderCreate(BaseModel):
    service_type: ServiceType
    items: List[OrderLineItem]
    customer_name: Optional[str] = None      # optional for OS dine-in
    customer_phone: Optional[str] = None
    customer_email: Optional[EmailStr] = None  # optional for dine-in ("tavolo")
    delivery_address: Optional[str] = None
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None
    origin_url: str = ""
    marketing_consent: bool = False
    # Dine-in
    table_code: Optional[str] = None  # e.g. "E1", "I3"
    table: Optional[str] = None       # OS-style alias of table_code
    waiter: Optional[str] = None      # waiter name / id

    @field_validator("service_type", mode="before")
    @classmethod
    def _norm_service(cls, v):
        return _normalize_service_type(v)

    def model_post_init(self, __context):
        if self.table and not self.table_code:
            object.__setattr__(self, "table_code", self.table)


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    service_type: ServiceType
    items: List[OrderLineItem]
    customer_name: str
    customer_phone: str
    customer_email: Optional[EmailStr] = None
    delivery_address: Optional[str] = None
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None
    subtotal: float
    total: float
    status: str = "pending_payment"
    payment_status: str = "initiated"
    stripe_session_id: Optional[str] = None
    created_at: str = Field(default_factory=_now_iso)
    marketing_consent: bool = False
    consent_date: Optional[str] = None
    # Dine-in
    table_code: Optional[str] = None
    waiter: Optional[str] = None


# ---------- Reservations ----------
class ReservationCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: EmailStr
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    guests: int
    notes: Optional[str] = None
    table_code: Optional[str] = None  # optional pre-assigned table
    zone: Optional[str] = None        # "interno" / "esterno" preferred zone
    booking_id: Optional[str] = None  # external Tierra OS booking id (Lark recordId)


class Reservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    customer_name: str
    customer_phone: str
    customer_email: Optional[EmailStr] = None
    date: str
    time: str
    guests: int
    notes: Optional[str] = None
    status: str = "pending"  # pending | confirmed | arrived | cancelled | no_show
    created_at: str = Field(default_factory=_now_iso)
    table_code: Optional[str] = None
    zone: Optional[str] = None
    source: str = "website"  # website | tierra_os | admin
    booking_id: Optional[str] = None       # Tierra OS Lark recordId (when synced)
    os_record_id: Optional[str] = None     # alias kept for back-compat with Lark UI


# ---------- Tables ----------
TableZone = Literal["interno", "esterno"]
TableStatus = Literal["libero", "riservato", "confermato", "arrivato", "accorpato", "cancellato", "occupato"]


def _normalize_table_status(v):
    """Map English/OS-style aliases to internal table statuses."""
    if not v:
        return v
    s = str(v).strip().lower()
    aliases = {
        "free": "libero", "available": "libero",
        "reserved": "riservato",
        "arrived": "arrivato",
        "merged": "accorpato",
        "cancelled": "cancellato", "canceled": "cancellato",
        "busy": "occupato", "occupied": "occupato",
    }
    return aliases.get(s, s)


class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    code: str                 # Unique code, e.g. "I1", "E3"
    label: Optional[str] = None
    zone: TableZone
    capacity: int = 2
    position: Optional[dict] = None  # {"row": int, "col": int} (optional layout hint)
    status: TableStatus = "libero"
    merged_with: List[str] = Field(default_factory=list)  # for "accorpato"
    order: int = 0
    updated_at: str = Field(default_factory=_now_iso)


class TableUpdate(BaseModel):
    status: Optional[TableStatus] = None
    merged_with: Optional[List[str]] = None
    capacity: Optional[int] = None
    label: Optional[str] = None

    @field_validator("status", mode="before")
    @classmethod
    def _norm_status(cls, v):
        return _normalize_table_status(v)


# ---------- Slot / Capacity config ----------
class SlotConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "default"
    slot_minutes: int = 60              # slot granularity
    max_guests_per_slot: int = 16       # total capacity (interno+esterno)
    max_per_zone: dict = Field(default_factory=lambda: {"interno": 10, "esterno": 6})
    # Optional: different rules per day of week (0=Mon ... 6=Sun)
    day_overrides: dict = Field(default_factory=dict)
    updated_at: str = Field(default_factory=_now_iso)


class SlotConfigUpdate(BaseModel):
    slot_minutes: Optional[int] = None
    max_guests_per_slot: Optional[int] = None
    max_per_zone: Optional[dict] = None
    day_overrides: Optional[dict] = None


# ---------- Tierra OS reservation payloads ----------
class TierraReservationCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[EmailStr] = None
    date: str
    time: str
    guests: int
    notes: Optional[str] = None
    table_code: Optional[str] = None
    zone: Optional[TableZone] = None  # interno/esterno (optional, for capacity check)
    status: str = "confirmed"         # OS-created are auto-confirmed by default
    auto_print: bool = True
    booking_id: Optional[str] = None   # Lark recordId (so site doesn't push back)


class TierraReservationUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    date: Optional[str] = None
    time: Optional[str] = None
    guests: Optional[int] = None
    notes: Optional[str] = None
    table_code: Optional[str] = None
    zone: Optional[TableZone] = None
    status: Optional[str] = None
    booking_id: Optional[str] = None


# ---------- Payments ----------
class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    order_id: str
    session_id: str
    amount: float
    currency: str = "eur"
    metadata: dict = Field(default_factory=dict)
    payment_status: str = "initiated"
    status: str = "open"
    created_at: str = Field(default_factory=_now_iso)


class CheckoutRequest(BaseModel):
    order_id: str
    origin_url: str


# ---------- Admin ----------
class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
