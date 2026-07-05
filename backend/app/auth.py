import jwt
from fastapi import Header, HTTPException, status
from .config import SUPABASE_JWT_SECRET, supabase_admin


class CurrentUser:
    def __init__(self, id: str, email: str | None, profile: dict):
        self.id = id
        self.email = email
        self.profile = profile
        self.role = profile.get("role", "customer")


def _decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")


async def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    """
    Every protected route depends on this. Expects:
        Authorization: Bearer <supabase-access-token>
    The frontend gets this token from supabase.auth.getSession() after login.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    payload = _decode_token(token)
    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    profile_res = (
        supabase_admin.table("profiles").select("*").eq("id", user_id).single().execute()
    )
    if not profile_res.data:
        raise HTTPException(status_code=404, detail="Profile not found for this user")

    return CurrentUser(id=user_id, email=email, profile=profile_res.data)


async def require_delivery_person(user: CurrentUser) -> CurrentUser:
    if user.role != "delivery_person":
        raise HTTPException(status_code=403, detail="Only delivery persons can do this")
    return user
