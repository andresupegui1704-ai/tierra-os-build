"""Pydantic models for Tierra Organic Bistro."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
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
ServiceType = Literal["delivery", "asporto", "preordine"]


class OrderLineItemSelection(BaseModel):
    group_name: str
    option_names: List[str]
    price_delta: float = 0.0


class OrderLineItem(BaseModel):
    item_id: str
    name: str
    price: float
    quantity: int
    customizations: List[OrderLineItemSelection] = Field(default_factory=list)
    unit_price: Optional[float] = None  # price + sum(customization deltas)
    line_total: Optional[float] = None  # unit_price * quantity


class OrderCreate(BaseModel):
    service_type: ServiceType
    items: List[OrderLineItem]
    customer_name: str
    customer_phone: str
    customer_email: EmailStr
    delivery_address: Optional[str] = None  # required if delivery
    scheduled_time: Optional[str] = None  # ISO string for pickup/delivery
    notes: Optional[str] = None
    origin_url: str


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    service_type: ServiceType
    items: List[OrderLineItem]
    customer_name: str
    customer_phone: str
    customer_email: EmailStr
    delivery_address: Optional[str] = None
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None
    subtotal: float
    total: float
    status: str = "pending_payment"  # pending_payment | paid | cancelled | preparing | ready | completed
    payment_status: str = "initiated"  # initiated | paid | failed | expired
    stripe_session_id: Optional[str] = None
    created_at: str = Field(default_factory=_now_iso)


# ---------- Reservations ----------
class ReservationCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: EmailStr
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    guests: int
    notes: Optional[str] = None


class Reservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    customer_name: str
    customer_phone: str
    customer_email: EmailStr
    date: str
    time: str
    guests: int
    notes: Optional[str] = None
    status: str = "pending"  # pending | confirmed | cancelled
    created_at: str = Field(default_factory=_now_iso)


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
