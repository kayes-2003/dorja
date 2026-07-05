from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_admin_user, CurrentUser
from ..config import supabase_admin
from ..schemas import RoleUpdate, VerifyUpdate, AdminStatusUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/requests")
def list_all_requests(admin: CurrentUser = Depends(get_admin_user)):
    """
    Every send in the system, newest first — with sender and assigned-courier
    names/phones attached, so the admin can see who placed it and who picked
    it up without a separate lookup.
    """
    res = (
        supabase_admin.table("delivery_requests")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    requests_data = res.data or []

    # delivery_person_id IS a profiles.id (delivery_persons.id references profiles.id),
    # so one lookup against profiles covers both sender and courier names.
    ids = {r["sender_id"] for r in requests_data if r.get("sender_id")}
    ids |= {r["delivery_person_id"] for r in requests_data if r.get("delivery_person_id")}

    profiles_by_id = {}
    if ids:
        profiles_res = (
            supabase_admin.table("profiles")
            .select("id, full_name, phone")
            .in_("id", list(ids))
            .execute()
        )
        profiles_by_id = {p["id"]: p for p in profiles_res.data}

    for r in requests_data:
        r["sender"] = profiles_by_id.get(r.get("sender_id"))
        r["courier"] = profiles_by_id.get(r.get("delivery_person_id")) if r.get("delivery_person_id") else None

    return requests_data


@router.patch("/requests/{request_id}/status")
def admin_update_status(request_id: str, body: AdminStatusUpdate, admin: CurrentUser = Depends(get_admin_user)):
    """Admin can force any status — confirm, cancel, or correct a stuck delivery."""
    existing = supabase_admin.table("delivery_requests").select("*").eq("id", request_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Request not found")
    res = supabase_admin.table("delivery_requests").update({"status": body.status}).eq("id", request_id).execute()
    return res.data[0]


@router.get("/users")
def list_users(admin: CurrentUser = Depends(get_admin_user)):
    """All registered users (customers, couriers, admins) — for role management."""
    res = (
        supabase_admin.table("profiles")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.patch("/users/{user_id}/role")
def set_role(user_id: str, body: RoleUpdate, admin: CurrentUser = Depends(get_admin_user)):
    supabase_admin.table("profiles").update({"role": body.role}).eq("id", user_id).execute()
    return {"message": "Role updated"}


@router.get("/delivery-persons")
def list_all_couriers(admin: CurrentUser = Depends(get_admin_user)):
    """
    Dedicated courier roster — platforms they already deliver for, verification
    status, rating, and total completed deliveries.
    """
    res = (
        supabase_admin.table("delivery_persons")
        .select("*, profiles(full_name, phone, address)")
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.patch("/delivery-persons/{courier_id}/verify")
def verify_courier(courier_id: str, body: VerifyUpdate, admin: CurrentUser = Depends(get_admin_user)):
    supabase_admin.table("delivery_persons").update({"is_verified": body.verified}).eq("id", courier_id).execute()
    return {"message": "Verification updated"}



from ..schemas import AdminAssignCourier  # add to the existing schemas import line instead if you prefer

@router.patch("/requests/{request_id}/assign")
def admin_assign_courier(request_id: str, body: AdminAssignCourier, admin: CurrentUser = Depends(get_admin_user)):
    """Manually hand a pending (or stuck) job to a specific courier — bypasses the normal accept flow."""
    existing = supabase_admin.table("delivery_requests").select("*").eq("id", request_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Request not found")

    courier = supabase_admin.table("delivery_persons").select("id").eq("id", body.delivery_person_id).execute()
    if not courier.data:
        raise HTTPException(status_code=404, detail="That courier is not registered")

    res = (
        supabase_admin.table("delivery_requests")
        .update({"delivery_person_id": body.delivery_person_id, "status": "accepted"})
        .eq("id", request_id)
        .execute()
    )
    return res.data[0]