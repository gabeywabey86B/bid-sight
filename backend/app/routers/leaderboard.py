"""Training leaderboard via the DB aggregation functions, global or per-school."""
from __future__ import annotations

from fastapi import APIRouter, Query

from ..supabase_client import get_client

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
def leaderboard(limit: int = Query(20, ge=1, le=100), school: str | None = Query(None)):
    sb = get_client()
    # Per-school boards get lower eligibility bars: rounds are dealt randomly
    # across schools, so per-school counts grow much slower than the global one.
    min_all, min_weekly = (5, 2) if school else (10, 3)
    all_time = (
        sb.rpc(
            "training_leaderboard",
            {"p_limit": limit, "p_weekly": False, "p_min_games": min_all, "p_school": school},
        )
        .execute()
        .data
    )
    weekly = (
        sb.rpc(
            "training_leaderboard",
            {"p_limit": limit, "p_weekly": True, "p_min_games": min_weekly, "p_school": school},
        )
        .execute()
        .data
    )
    top_scores = sb.rpc("top_scores", {"p_limit": 10, "p_school": school}).execute().data
    return {"all_time": all_time, "weekly": weekly, "top_scores": top_scores}
