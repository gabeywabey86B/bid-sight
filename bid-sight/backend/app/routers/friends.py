"""One-way instant-follow friends list (no request/accept)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth import current_user_id
from ..supabase_client import get_client

router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("")
def get_friends(user_id: str = Depends(current_user_id)):
    sb = get_client()
    # friends has two FKs into profiles (user_id, friend_id), so the embed
    # target must be disambiguated with the !fkey hint or PostgREST rejects
    # it as an ambiguous relationship (PGRST201).
    rows = (
        sb.table("friends")
        .select("friend_id, profiles!friends_friend_id_fkey(display_name)")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    return {
        "friends": [
            {"friend_id": r["friend_id"], "display_name": r["profiles"]["display_name"]}
            for r in rows
        ]
    }


class FriendIn(BaseModel):
    friend_id: str


@router.post("")
def add_friend(body: FriendIn, user_id: str = Depends(current_user_id)):
    if body.friend_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    sb = get_client()
    target = sb.table("profiles").select("id").eq("id", body.friend_id).limit(1).execute().data
    if not target:
        raise HTTPException(status_code=404, detail="Profile not found")

    existing = (
        sb.table("friends")
        .select("user_id")
        .eq("user_id", user_id)
        .eq("friend_id", body.friend_id)
        .limit(1)
        .execute()
        .data
    )
    if not existing:
        sb.table("friends").insert({"user_id": user_id, "friend_id": body.friend_id}).execute()
    return {"friend_id": body.friend_id}


@router.delete("/{friend_id}")
def remove_friend(friend_id: str, user_id: str = Depends(current_user_id)):
    sb = get_client()
    sb.table("friends").delete().eq("user_id", user_id).eq("friend_id", friend_id).execute()
    return {"friend_id": friend_id}
