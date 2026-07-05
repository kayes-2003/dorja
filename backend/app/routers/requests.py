from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user, CurrentUser
from ..config import supabase_admin
from ..schemas import DeliveryRequestCreate, StatusUpdate, RatingCreate

router = APIRouter(prefix="/requests", tags=["requests"])


def _notify(profile_id: str, message: str):
    supabase_admin.table("notifications").insert({"profile_id": profile_id, "message": message}).execute()


@router.post("")
def create_request(body: DeliveryRequestCreate, user: CurrentUser = Depends(get_current_user)):
    """
    Anyone (customer or off-duty courier) can create a send:
      - a normal parcel to someone in the same area
      - a "surprise" (gift/card) with a note, hidden from the receiver until delivery
      - pickup either from the sender's own address or from a local shop/supershop
    """
    if body.pickup_type == "from_shop" and not body.shop_id:
        raise HTTPException(status_code=400, detail="Please select a shop for shop pickup, or switch to 'Pick up from me'.")

    payload = body.model_dump()
    payload["sender_id"] = user.id
    try:
        res = supabase_admin.table("delivery_requests").insert(payload).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not create the send: {e}")

    if not res.data:
        raise HTTPException(status_code=400, detail="Could not create the send — check the area is valid.")
    return res.data[0]


@router.get("/mine")
def my_requests(user: CurrentUser = Depends(get_current_user)):
    """Requests this user has sent."""
    res = (
        supabase_admin.table("delivery_requests")
        .select("*")
        .eq("sender_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.get("/assigned")
def my_deliveries(user: CurrentUser = Depends(get_current_user)):
    """Requests this delivery person has accepted / is carrying."""
    if user.role != "delivery_person":
        raise HTTPException(status_code=403, detail="Only delivery persons can view this")
    res = (
        supabase_admin.table("delivery_requests")
        .select("*")
        .eq("delivery_person_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data

@router.get("/available")
def available_requests(user: CurrentUser = Depends(get_current_user)):
    """
    All pending sends, network-wide — sorted so jobs in the courier's own area
    come first (easiest to grab alongside their regular route), followed by
    everything else. This way a courier is never blocked from picking up work
    just because their profile's area doesn't exactly match a job's area.
    """
    if user.role != "delivery_person":
        raise HTTPException(status_code=403, detail="Only delivery persons can view this")

    dp = supabase_admin.table("delivery_persons").select("area_id").eq("id", user.id).execute()
    courier_area_id = dp.data[0]["area_id"] if dp.data and dp.data[0].get("area_id") else None

    res = (
        supabase_admin.table("delivery_requests")
        .select("*, areas(name)")
        .eq("status", "pending")
        .order("created_at")
        .execute()
    )
    jobs = res.data or []

    own_area = [j for j in jobs if j.get("area_id") == courier_area_id]
    other_area = [j for j in jobs if j.get("area_id") != courier_area_id]
    return own_area + other_area


@router.post("/{request_id}/accept")
def accept_request(request_id: str, user: CurrentUser = Depends(get_current_user)):
    if user.role != "delivery_person":
        raise HTTPException(status_code=403, detail="Only delivery persons can accept jobs")

    existing = supabase_admin.table("delivery_requests").select("*").eq("id", request_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Request not found")
    if existing.data["status"] != "pending":
        raise HTTPException(status_code=409, detail="Request already taken or no longer pending")

    res = (
        supabase_admin.table("delivery_requests")
        .update({"status": "accepted", "delivery_person_id": user.id})
        .eq("id", request_id)
        .eq("status", "pending")  # optimistic lock: avoid two couriers grabbing it at once
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=409, detail="Someone else just accepted this request")

    _notify(existing.data["sender_id"], f"A delivery person accepted your send to {existing.data['receiver_name']}.")
    return res.data[0]


@router.patch("/{request_id}/status")
def update_status(request_id: str, body: StatusUpdate, user: CurrentUser = Depends(get_current_user)):
    existing = supabase_admin.table("delivery_requests").select("*").eq("id", request_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Request not found")

    req = existing.data
    is_sender = user.id == req["sender_id"]
    is_courier = user.id == req["delivery_person_id"]

    if body.status == "cancelled":
        if not is_sender or req["status"] != "pending":
            raise HTTPException(status_code=403, detail="Only the sender can cancel, and only while pending")
    else:
        if not is_courier:
            raise HTTPException(status_code=403, detail="Only the assigned delivery person can update this status")

    res = supabase_admin.table("delivery_requests").update({"status": body.status}).eq("id", request_id).execute()

    if body.status == "delivered":
        supabase_admin.table("delivery_persons").update(
            {"total_deliveries": supabase_admin.table("delivery_persons").select("total_deliveries").eq("id", user.id).single().execute().data["total_deliveries"] + 1}
        ).eq("id", user.id).execute()
        note = " (surprise delivered!)" if req.get("is_surprise") else ""
        _notify(req["sender_id"], f"Your send to {req['receiver_name']} was delivered{note}.")
    elif body.status == "picked_up":
        _notify(req["sender_id"], f"Your send to {req['receiver_name']} was picked up and is on its way.")
    elif body.status == "cancelled":
        if req.get("delivery_person_id"):
            _notify(req["delivery_person_id"], "A job you were assigned was cancelled by the sender.")

    return res.data[0]


@router.get("/{request_id}")
def get_request(request_id: str, user: CurrentUser = Depends(get_current_user)):
    res = supabase_admin.table("delivery_requests").select("*").eq("id", request_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Request not found")
    req = res.data
    if user.id not in (req["sender_id"], req.get("delivery_person_id")):
        raise HTTPException(status_code=403, detail="Not your request")
    return req


@router.post("/rate")
def rate_request(body: RatingCreate, user: CurrentUser = Depends(get_current_user)):
    req = supabase_admin.table("delivery_requests").select("*").eq("id", body.request_id).single().execute()
    if not req.data:
        raise HTTPException(status_code=404, detail="Request not found")
    if user.id not in (req.data["sender_id"], req.data.get("delivery_person_id")):
        raise HTTPException(status_code=403, detail="Not part of this delivery")

    supabase_admin.table("ratings").insert(
        {"request_id": body.request_id, "rated_by": user.id, "rating": body.rating, "comment": body.comment}
    ).execute()

    # Recompute courier's average rating if the sender rated the courier
    dp_id = req.data.get("delivery_person_id")
    if dp_id and user.id != dp_id:
        all_ratings = (
            supabase_admin.table("ratings")
            .select("rating, delivery_requests!inner(delivery_person_id)")
            .eq("delivery_requests.delivery_person_id", dp_id)
            .execute()
        )
        scores = [r["rating"] for r in all_ratings.data]
        if scores:
            avg = round(sum(scores) / len(scores), 1)
            supabase_admin.table("delivery_persons").update({"rating_avg": avg}).eq("id", dp_id).execute()

    return {"message": "Rating submitted"}
