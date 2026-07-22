"""LIVE auction rounds: admin manually configures a round (course, section,
seats), users bid once each, closing the round clears seats to the top-N
bids. No Supabase Realtime — the frontend polls, so closing is lazy: any
open round past its ends_at gets closed as a side effect of the next request
that touches it, rather than by a background scheduler.
"""
from __future__ import annotations

import statistics
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..auth import current_admin_id, current_user_id
from ..supabase_client import get_client

router = APIRouter(prefix="/live", tags=["live"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _close_round(sb, round_id: str) -> None:
    round_row = sb.table("live_rounds").select("*").eq("id", round_id).limit(1).execute().data
    if not round_row or round_row[0]["status"] != "open":
        return
    round_row = round_row[0]

    bids = (
        sb.table("live_bids")
        .select("id, user_id, amount, created_at")
        .eq("round_id", round_id)
        .order("amount", desc=True)
        .order("created_at", desc=False)
        .execute()
        .data
    )

    seats = round_row["seats_allocated"]
    winners = bids[:seats]
    winner_ids = {b["id"] for b in winners}

    for b in bids:
        sb.table("live_bids").update({"is_winner": b["id"] in winner_ids}).eq(
            "id", b["id"]
        ).execute()

    amounts = [b["amount"] for b in bids]
    updates = {
        "status": "closed",
        "seats_filled": len(winners),
        "bid_count": len(bids),
        "clearing_price": winners[-1]["amount"] if winners else None,
        "avg_bid": statistics.mean(amounts) if amounts else None,
        "min_bid": min(amounts) if amounts else None,
        "max_bid": max(amounts) if amounts else None,
        "median_bid": statistics.median(amounts) if amounts else None,
    }
    sb.table("live_rounds").update(updates).eq("id", round_id).execute()


def _auto_close_expired(sb, round_id: str | None = None) -> None:
    q = sb.table("live_rounds").select("id").eq("status", "open").lt("ends_at", _now_iso())
    if round_id:
        q = q.eq("id", round_id)
    for row in q.execute().data:
        _close_round(sb, row["id"])


def _is_locked_out(sb, user_id: str, session_id: str, course_code: str, section: str) -> bool:
    closed_round_ids = {
        r["id"]
        for r in sb.table("live_rounds")
        .select("id")
        .eq("session_id", session_id)
        .eq("course_code", course_code)
        .eq("section", section)
        .eq("status", "closed")
        .execute()
        .data
    }
    if not closed_round_ids:
        return False
    winning_bids = (
        sb.table("live_bids")
        .select("round_id")
        .eq("user_id", user_id)
        .eq("is_winner", True)
        .in_("round_id", list(closed_round_ids))
        .limit(1)
        .execute()
        .data
    )
    return bool(winning_bids)


def _round_aggregates(round_row: dict) -> dict:
    return {
        "clearing_price": round_row["clearing_price"],
        "seats_filled": round_row["seats_filled"],
        "seats_allocated": round_row["seats_allocated"],
        "bid_count": round_row["bid_count"],
        "avg_bid": round_row["avg_bid"],
        "min_bid": round_row["min_bid"],
        "max_bid": round_row["max_bid"],
        "median_bid": round_row["median_bid"],
    }


@router.get("/current")
def get_current(user_id: str = Depends(current_user_id)):
    sb = get_client()
    _auto_close_expired(sb)

    open_rows = (
        sb.table("live_rounds").select("*").eq("status", "open").limit(1).execute().data
    )
    closed_rows = (
        sb.table("live_rounds")
        .select("*")
        .eq("status", "closed")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )

    round_out = None
    my_bid = None
    locked_out = False
    if open_rows:
        r = open_rows[0]
        round_out = {
            k: r[k]
            for k in (
                "id",
                "session_id",
                "round_label",
                "course_code",
                "section",
                "description",
                "starts_at",
                "ends_at",
                "seats_allocated",
                "status",
            )
        }
        mine = (
            sb.table("live_bids")
            .select("amount")
            .eq("round_id", r["id"])
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
        )
        my_bid = mine[0]["amount"] if mine else None
        locked_out = _is_locked_out(sb, user_id, r["session_id"], r["course_code"], r["section"])

    last_closed = None
    if closed_rows:
        r = closed_rows[0]
        their_bid = (
            sb.table("live_bids")
            .select("amount, is_winner")
            .eq("round_id", r["id"])
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
        )
        last_closed = {
            "round_label": r["round_label"],
            "course_code": r["course_code"],
            "section": r["section"],
            "results": _round_aggregates(r),
            "my_bid": their_bid[0]["amount"] if their_bid else None,
            "i_won": bool(their_bid and their_bid[0]["is_winner"]),
        }

    return {"round": round_out, "my_bid": my_bid, "locked_out": locked_out, "last_closed": last_closed}


@router.get("/rounds/{round_id}")
def get_round(round_id: str, user_id: str = Depends(current_user_id)):
    sb = get_client()
    _auto_close_expired(sb, round_id)

    rows = sb.table("live_rounds").select("*").eq("id", round_id).limit(1).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Round not found")
    r = rows[0]

    mine = (
        sb.table("live_bids")
        .select("amount, is_winner")
        .eq("round_id", round_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
    )
    my_bid = mine[0]["amount"] if mine else None

    if r["status"] != "closed":
        return {
            "id": r["id"],
            "round_label": r["round_label"],
            "course_code": r["course_code"],
            "section": r["section"],
            "description": r["description"],
            "starts_at": r["starts_at"],
            "ends_at": r["ends_at"],
            "seats_allocated": r["seats_allocated"],
            "status": r["status"],
            "my_bid": my_bid,
        }

    return {
        "id": r["id"],
        "round_label": r["round_label"],
        "course_code": r["course_code"],
        "section": r["section"],
        "status": r["status"],
        "results": _round_aggregates(r),
        "my_bid": my_bid,
        "i_won": bool(mine and mine[0]["is_winner"]),
    }


class BidIn(BaseModel):
    amount: float = Field(gt=0)


@router.post("/rounds/{round_id}/bids")
def submit_bid(round_id: str, body: BidIn, user_id: str = Depends(current_user_id)):
    sb = get_client()
    _auto_close_expired(sb, round_id)

    rows = sb.table("live_rounds").select("*").eq("id", round_id).limit(1).execute().data
    if not rows:
        raise HTTPException(status_code=400, detail="Round not found")
    r = rows[0]
    if r["status"] != "open":
        raise HTTPException(status_code=400, detail="Round is not open for bidding")

    if _is_locked_out(sb, user_id, r["session_id"], r["course_code"], r["section"]):
        raise HTTPException(
            status_code=409, detail="You already won a seat for this course/section"
        )

    existing = (
        sb.table("live_bids")
        .select("id")
        .eq("round_id", round_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
    )
    if existing:
        raise HTTPException(status_code=409, detail="You already bid on this round")

    sb.table("live_bids").insert(
        {"round_id": round_id, "user_id": user_id, "amount": body.amount}
    ).execute()
    return {"round_id": round_id, "amount": body.amount}


# ---------- Admin ----------


class SessionIn(BaseModel):
    name: str = Field(min_length=1)


@router.post("/admin/sessions")
def create_session(body: SessionIn, admin_id: str = Depends(current_admin_id)):
    sb = get_client()
    row = (
        sb.table("live_sessions")
        .insert({"name": body.name, "created_by": admin_id})
        .execute()
        .data
    )
    return row[0]


@router.get("/admin/sessions")
def list_sessions(admin_id: str = Depends(current_admin_id)):
    sb = get_client()
    rows = sb.table("live_sessions").select("*").order("created_at", desc=True).execute().data
    return {"sessions": rows}


@router.get("/admin/sessions/{session_id}/rounds")
def list_rounds(session_id: str, admin_id: str = Depends(current_admin_id)):
    sb = get_client()
    _auto_close_expired(sb)
    rows = (
        sb.table("live_rounds")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
        .data
    )
    return {"rounds": rows}


class RoundIn(BaseModel):
    round_label: str = Field(min_length=1)
    course_code: str = Field(min_length=1)
    section: str = Field(min_length=1)
    description: str | None = None
    starts_at: str | None = None
    ends_at: str | None = None
    seats_allocated: int = Field(ge=0)


@router.post("/admin/sessions/{session_id}/rounds")
def create_round(session_id: str, body: RoundIn, admin_id: str = Depends(current_admin_id)):
    sb = get_client()
    row = (
        sb.table("live_rounds")
        .insert({"session_id": session_id, "status": "draft", **body.model_dump()})
        .execute()
        .data
    )
    return row[0]


@router.post("/admin/rounds/{round_id}/open")
def open_round(round_id: str, admin_id: str = Depends(current_admin_id)):
    sb = get_client()
    rows = sb.table("live_rounds").select("session_id").eq("id", round_id).limit(1).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Round not found")
    session_id = rows[0]["session_id"]

    other_open = (
        sb.table("live_rounds")
        .select("id")
        .eq("session_id", session_id)
        .eq("status", "open")
        .neq("id", round_id)
        .limit(1)
        .execute()
        .data
    )
    if other_open:
        raise HTTPException(
            status_code=400, detail="Another round in this session is already open"
        )

    updated = (
        sb.table("live_rounds").update({"status": "open"}).eq("id", round_id).execute().data
    )
    return updated[0]


@router.post("/admin/rounds/{round_id}/close")
def close_round(round_id: str, admin_id: str = Depends(current_admin_id)):
    sb = get_client()
    _close_round(sb, round_id)
    updated = sb.table("live_rounds").select("*").eq("id", round_id).limit(1).execute().data
    if not updated:
        raise HTTPException(status_code=404, detail="Round not found")
    return updated[0]


@router.get("/admin/rounds/{round_id}/bids")
def round_bids(round_id: str, admin_id: str = Depends(current_admin_id)):
    sb = get_client()
    bids = (
        sb.table("live_bids")
        .select("user_id, amount, is_winner, created_at")
        .eq("round_id", round_id)
        .order("amount", desc=True)
        .execute()
        .data
    )
    user_ids = list({b["user_id"] for b in bids})
    names = {}
    if user_ids:
        profiles = (
            sb.table("profiles").select("id, display_name").in_("id", user_ids).execute().data
        )
        names = {p["id"]: p["display_name"] for p in profiles}

    return {
        "bids": [
            {
                "user_id": b["user_id"],
                "display_name": names.get(b["user_id"], "?"),
                "amount": b["amount"],
                "is_winner": b["is_winner"],
                "created_at": b["created_at"],
            }
            for b in bids
        ]
    }


@router.get("/admin/seats-remaining")
def seats_remaining(
    course_code: str, section: str, admin_id: str = Depends(current_admin_id)
):
    sb = get_client()
    rows = (
        sb.table("live_rounds")
        .select("seats_allocated, seats_filled")
        .eq("course_code", course_code)
        .eq("section", section)
        .eq("status", "closed")
        .execute()
        .data
    )
    allocated = sum(r["seats_allocated"] or 0 for r in rows)
    filled = sum(r["seats_filled"] or 0 for r in rows)
    return {"remaining": max(allocated - filled, 0)}
