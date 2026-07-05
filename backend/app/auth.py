from fastapi import Depends, Header, HTTPException, status
from .config import supabase_admin


class CurrentUser:
    def __init__(self, id: str, email: str | None, profile: dict):
        self.id = id
        self.email = email
        self.profile = profile
        self.role = profile.get("role", "customer")


async def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    """
    Every protected route depends on this. Expects:
        Authorization: Bearer <supabase-access-token>
    The frontend gets this token from supabase.auth.getSession() after login.

    Verification is delegated to Supabase itself (rather than decoding the JWT
    locally) so this works correctly whether the project uses the legacy
    HS256 shared-secret signing or the newer ES256 asymmetric signing keys.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        user_response = supabase_admin.auth.get_user(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    user = user_response.user if user_response else None
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    profile_res = (
        supabase_admin.table("profiles").select("*").eq("id", user.id).single().execute()
    )
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not found for this user")

    return CurrentUser(id=user.id, email=user.email, profile=profile_res.data)


async def get_admin_user(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user