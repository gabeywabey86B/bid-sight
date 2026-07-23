"""Profile lookup/edit + pre-signup name availability check."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..auth import current_user_id
from ..supabase_client import get_client

router = APIRouter(prefix="/profiles", tags=["profiles"])


def _escape_ilike(value: str) -> str:
    # ilike treats % and _ as wildcards; escape them so a name containing
    # those characters can't match unrelated rows.
    return value.replace("%", r"\%").replace("_", r"\_")


@router.get("/check-name")
def check_name(name: str = Query(..., min_length=1)):
    sb = get_client()
    rows = (
        sb.table("profiles")
        .select("id")
        .ilike("display_name", _escape_ilike(name))
        .limit(1)
        .execute()
        .data
    )
    return {"available": not rows}


@router.get("/me")
def get_my_profile(user_id: str = Depends(current_user_id)):
    sb = get_client()
    rows = (
        sb.table("profiles")
        .select("id, display_name, is_admin")
        .eq("id", user_id)
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Profile not found")
    return rows[0]


class DisplayNameIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=64)


@router.patch("/me")
def update_display_name(body: DisplayNameIn, user_id: str = Depends(current_user_id)):
    sb = get_client()
    taken = (
        sb.table("profiles")
        .select("id")
        .ilike("display_name", _escape_ilike(body.display_name))
        .neq("id", user_id)
        .limit(1)
        .execute()
        .data
    )
    if taken:
        raise HTTPException(status_code=409, detail="That name is taken")

    updated = (
        sb.table("profiles")
        .update({"display_name": body.display_name})
        .eq("id", user_id)
        .execute()
        .data
    )
    return updated[0]


@router.get("/search")
def search_profiles(q: str = Query(..., min_length=1), user_id: str = Depends(current_user_id)):
    sb = get_client()
    matches = (
        sb.table("profiles")
        .select("id, display_name")
        .ilike("display_name", f"%{_escape_ilike(q)}%")
        .neq("id", user_id)
        .limit(10)
        .execute()
        .data
    )
    if not matches:
        return {"results": []}

    friend_ids = {
        r["friend_id"]
        for r in sb.table("friends").select("friend_id").eq("user_id", user_id).execute().data
    }
    return {
        "results": [{**m, "is_friend": m["id"] in friend_ids} for m in matches]
    }
