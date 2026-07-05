from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user, CurrentUser
from ..config import supabase_admin
from ..schemas import DeliveryPersonRegister

router = APIRouter(prefix="/delivery-persons", tags=["delivery-persons"])


@router.post("/register")
def register_as_delivery_person(body: DeliveryPersonRegister, user: CurrentUser = Depends(get_current_user)):
    """
    Lets an existing user (already a courier for Daraz/CarryBee/Paperfly/Steadfast/etc.)
    opt into the local-send network. Flips their profile role to delivery_person and
    creates/updates their delivery_persons row.
    """
    supabase_admin.table("profiles").update({"role": "delivery_person", "area_id": body.area_id}).eq(
        "id", user.id
    ).execute()

    existing = supabase_admin.table("delivery_persons").select("id").eq("id", user.id).execute()
    payload = {
        "id": user.id,
        "platforms": body.platforms,
        "vehicle_type": body.vehicle_type,
        "area_id": body.area_id,
    }
    if existing.data:
        supabase_admin.table("delivery_persons").update(payload).eq("id", user.id).execute()
    else:
        supabase_admin.table("delivery_persons").insert(payload).execute()

    return {"message": "Registered as delivery person", "id": user.id}


@router.get("/area/{area_id}")
def list_delivery_persons_in_area(area_id: str):
    """Browse trusted, verified couriers active in a given neighbourhood."""
    res = (
        supabase_admin.table("delivery_persons")
        .select("*, profiles(full_name, phone)")
        .eq("area_id", area_id)
        .eq("is_active", True)
        .execute()
    )
    return res.data


@router.patch("/me/toggle-active")
def toggle_active(user: CurrentUser = Depends(get_current_user)):
    if user.role != "delivery_person":
        raise HTTPException(status_code=403, detail="Only delivery persons can do this")
    current = supabase_admin.table("delivery_persons").select("is_active").eq("id", user.id).single().execute()
    new_state = not current.data["is_active"]
    supabase_admin.table("delivery_persons").update({"is_active": new_state}).eq("id", user.id).execute()
    return {"is_active": new_state}
