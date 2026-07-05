from fastapi import APIRouter
from ..config import supabase_admin

router = APIRouter(prefix="/areas", tags=["areas"])


@router.get("")
def list_areas():
    res = supabase_admin.table("areas").select("*").order("name").execute()
    return res.data


@router.get("/{area_id}/shops")
def list_shops_in_area(area_id: str):
    res = supabase_admin.table("shops").select("*").eq("area_id", area_id).execute()
    return res.data
