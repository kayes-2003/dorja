from fastapi import APIRouter, Depends
from ..auth import get_current_user, CurrentUser
from ..config import supabase_admin

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def my_notifications(user: CurrentUser = Depends(get_current_user)):
    res = (
        supabase_admin.table("notifications")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return res.data


@router.patch("/{notification_id}/read")
def mark_read(notification_id: str, user: CurrentUser = Depends(get_current_user)):
    supabase_admin.table("notifications").update({"is_read": True}).eq("id", notification_id).eq(
        "profile_id", user.id
    ).execute()
    return {"message": "ok"}
