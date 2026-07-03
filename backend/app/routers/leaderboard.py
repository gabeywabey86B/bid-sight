"""Global training leaderboard via the DB aggregation function."""
from __future__ import annotations

from fastapi import APIRouter, Query

from ..supabase_client import get_client

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def leaderboard(limit: int = Query(20, ge=1, le=100)):
    sb = get_client()
    rows = sb.rpc("training_leaderboard", {"p_limit": limit}).execute().data
    return {"leaderboard": rows}
