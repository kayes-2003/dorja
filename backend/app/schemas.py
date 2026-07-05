from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ---------- Profiles / Delivery persons ----------

class DeliveryPersonRegister(BaseModel):
    platforms: List[str] = Field(default_factory=list, description="e.g. Daraz, CarryBee, Paperfly, Steadfast")
    vehicle_type: Optional[str] = None
    area_id: str


class DeliveryPersonOut(BaseModel):
    id: str
    full_name: str
    phone: Optional[str] = None
    platforms: List[str] = []
    vehicle_type: Optional[str] = None
    is_verified: bool
    is_active: bool
    rating_avg: float
    total_deliveries: int
    area_id: Optional[str] = None


# ---------- Delivery requests ----------

from pydantic import field_validator

class DeliveryRequestCreate(BaseModel):
    area_id: str
    pickup_type: str = Field(default="from_sender", pattern="^(from_sender|from_shop)$")
    shop_id: Optional[str] = None
    pickup_address: Optional[str] = None

    receiver_name: str
    receiver_phone: str
    receiver_address: str

    item_description: Optional[str] = None
    is_surprise: bool = False
    surprise_note: Optional[str] = None

    price: float = 0

    @field_validator("shop_id", "pickup_address", "item_description", "surprise_note", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        # An empty string from an untouched form field must become NULL,
        # not "" — Postgres rejects "" for the shop_id UUID column.
        if v == "":
            return None
        return v


class DeliveryRequestOut(BaseModel):
    id: str
    sender_id: str
    delivery_person_id: Optional[str] = None
    area_id: str
    pickup_type: str
    shop_id: Optional[str] = None
    pickup_address: Optional[str] = None
    receiver_name: str
    receiver_phone: str
    receiver_address: str
    item_description: Optional[str] = None
    is_surprise: bool
    surprise_note: Optional[str] = None
    status: str
    price: float
    created_at: datetime
    updated_at: datetime


class StatusUpdate(BaseModel):
    status: str = Field(pattern="^(accepted|picked_up|delivered|cancelled)$")


class RatingCreate(BaseModel):
    request_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class RoleUpdate(BaseModel):
    role: str = Field(pattern="^(customer|delivery_person|admin)$")


class VerifyUpdate(BaseModel):
    verified: bool


class AdminStatusUpdate(BaseModel):
    status: str = Field(pattern="^(pending|accepted|picked_up|delivered|cancelled)$")


class AdminAssignCourier(BaseModel):
    delivery_person_id: str