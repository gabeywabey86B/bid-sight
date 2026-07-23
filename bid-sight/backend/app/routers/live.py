"""LIVE auction rounds: admin manually configures a round (course, section,
seats), users bid once each, closing the round clears seats to the top-N
bids. No Supabase Realtime — the frontend polls, so closing is lazy: any
open round past its ends_at gets closed as a side effect of the next request
that touches it, rather than by a background scheduler.
"""
from __future__ import annotations

import logging
import statistics
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..auth import current_admin_id, current_user_id
from ..supabase_client import get_client

router = APIRouter(prefix="/live", tags=["live"])
logger = logging.getLogger(__name__)

# The real BOSS window sequence for a Regular Academic Session, verified
# against the term exports in supabase_sql/.
BOSS_WINDOWS = [
    "Round 1 Window 1",
    "Round 1A Window 1",
    "Round 1A Window 2",
    "Round 1A Window 3",
    "Round 1B Window 1",
    "Round 1B Window 2",
    "Round 2 Window 1",
    "Round 2 Window 2",
    "Round 2 Window 3",
    "Round 2A Window 1",
    "Round 2A Window 2",
    "Round 2A Window 3",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uuid_or_400(value: str, field: str) -> str:
    """Path params are typed str, so FastAPI does not validate them; without
    this a malformed id reaches PostgREST and comes back as a 500."""
    try:
        return str(uuid.UUID(value))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid {field}")


def _remaining_seats(capacity: int, closed_rounds: list[dict]) -> int:
    """Seats available in the next window = capacity minus everything already
    filled. seats_filled is null on rounds that closed with no bids."""
    return max(capacity - sum(r["seats_filled"] or 0 for r in closed_rounds), 0)


def _ladder_rounds(sb, session_id: str, course_code: str, section: str) -> list[dict]:
    return (
        sb.table("live_rounds")
        .select("id, round_index, status, seats_allocated, seats_filled")
        .eq("session_id", session_id)
        .eq("course_code", course_code)
        .eq("section", section)
        .order("round_index")
        .execute()
        .data
    )


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
    session_id = _uuid_or_400(session_id, "session_id")
    sb = get_client()
    _auto_close_expired(sb)
    rows = (
        sb.table("live_rounds")
        .select("*")
        .eq("session_id", session_id)
        .order("round_index", desc=False)
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
    round_id = _uuid_or_400(round_id, "round_id")
    sb = get_client()
    rows = (
        sb.table("live_rounds")
        .select("session_id, course_code, section, round_index, status")
        .eq("id", round_id)
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Round not found")
    r = rows[0]
    if r["status"] != "draft":
        raise HTTPException(status_code=409, detail=f"Round is already {r['status']}")

    other_open = (
        sb.table("live_rounds")
        .select("id")
        .eq("session_id", r["session_id"])
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

    updates: dict = {"status": "open"}

    # Ladder rounds carry seats forward: what's left is only knowable now, once
    # every earlier window has closed. Rounds created outside a ladder keep the
    # seat count they were created with.
    if r["round_index"] is not None:
        ladder = _ladder_rounds(sb, r["session_id"], r["course_code"], r["section"])
        first = next((x for x in ladder if x["round_index"] == 0), None)
        if first is None:
            raise HTTPException(
                status_code=409,
                detail="Ladder is missing its first round, so capacity is unknown",
            )
        capacity = first["seats_allocated"]
        remaining = _remaining_seats(capacity, [x for x in ladder if x["status"] == "closed"])
        logger.warning(
            "resolving ladder seats admin=%s round=%s capacity=%s remaining=%s",
            admin_id,
            round_id,
            capacity,
            remaining,
        )
        if remaining == 0:
            raise HTTPException(status_code=400, detail="No seats remaining in this ladder")
        updates["seats_allocated"] = remaining

    updated = sb.table("live_rounds").update(updates).eq("id", round_id).execute().data
    return updated[0]


@router.post("/admin/rounds/{round_id}/close")
def close_round(round_id: str, admin_id: str = Depends(current_admin_id)):
    round_id = _uuid_or_400(round_id, "round_id")
    sb = get_client()
    _close_round(sb, round_id)
    updated = sb.table("live_rounds").select("*").eq("id", round_id).limit(1).execute().data
    if not updated:
        raise HTTPException(status_code=404, detail="Round not found")
    return updated[0]


@router.get("/admin/rounds/{round_id}/bids")
def round_bids(round_id: str, admin_id: str = Depends(current_admin_id)):
    round_id = _uuid_or_400(round_id, "round_id")
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


class LadderIn(BaseModel):
    course_code: str = Field(min_length=1, max_length=32)
    section: str = Field(min_length=1, max_length=32)
    capacity_override: int | None = Field(default=None, ge=0)


@router.post("/admin/sessions/{session_id}/ladder")
def create_ladder(
    session_id: str, body: LadderIn, admin_id: str = Depends(current_admin_id)
):
    """Generate the full 12-window BOSS ladder for one course section.

    Only the first window gets real seats; every later window is a placeholder
    resolved by open_round once the preceding windows have cleared.
    """
    session_id = _uuid_or_400(session_id, "session_id")
    sb = get_client()

    if not sb.table("live_sessions").select("id").eq("id", session_id).limit(1).execute().data:
        raise HTTPException(status_code=404, detail="Session not found")

    # The section is typed by hand, so normalise before matching: the table
    # stores "G1"/"SG82", not "g1".
    course_code = body.course_code.strip().upper()
    section = body.section.strip().upper()

    # Most recent term wins — that's the seat count worth simulating.
    match = (
        sb.table("bidding_table_info")
        .select("description, opening_vacancy, term")
        .eq("course_code", course_code)
        .eq("section", section)
        .order("term", desc=True)
        .limit(1)
        .execute()
        .data
    )

    if match:
        description = match[0]["description"]
        opening_vacancy = match[0]["opening_vacancy"] or 0
    elif body.capacity_override:
        # Section isn't in the historical data — allowed, but only when the
        # admin supplies the capacity, since we can't infer it.
        description = None
        opening_vacancy = 0
    else:
        raise HTTPException(
            status_code=404,
            detail=f"No record of {course_code} {section} — check the section, or set a capacity manually",
        )

    capacity = (
        body.capacity_override if body.capacity_override is not None else opening_vacancy
    )
    if capacity <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"{course_code} {section} has no opening vacancy on record — set a capacity manually",
        )

    # ponytail: a ladder is (session_id, course_code, section) — a second ladder
    # for the same section in one session would merge into the first, so refuse.
    # Add a ladder_id column if sessions ever need to re-run a section.
    if _ladder_rounds(sb, session_id, course_code, section):
        raise HTTPException(
            status_code=409, detail="A ladder for this section already exists in this session"
        )

    rows = [
        {
            "session_id": session_id,
            "round_index": i,
            "round_label": label,
            "course_code": course_code,
            "section": section,
            "description": description,
            "seats_allocated": capacity if i == 0 else 0,
            "status": "draft",
        }
        for i, label in enumerate(BOSS_WINDOWS)
    ]
    created = sb.table("live_rounds").insert(rows).execute().data
    return {"rounds": created, "capacity": capacity}


@router.delete("/admin/rounds/{round_id}")
def delete_round(round_id: str, admin_id: str = Depends(current_admin_id)):
    round_id = _uuid_or_400(round_id, "round_id")
    sb = get_client()

    rows = (
        sb.table("live_rounds").select("id, status").eq("id", round_id).limit(1).execute().data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Round not found")
    if rows[0]["status"] != "draft":
        raise HTTPException(
            status_code=409,
            detail=f"Only draft rounds can be deleted — this one is {rows[0]['status']}",
        )

    # Independent of the status check: a draft should never have bids, so if it
    # does, the status is lying and the delete would destroy real bids.
    bids = sb.table("live_bids").select("id").eq("round_id", round_id).limit(1).execute().data
    if bids:
        raise HTTPException(status_code=409, detail="Round has bids and cannot be deleted")

    logger.warning("deleting draft round admin=%s round=%s", admin_id, round_id)
    sb.table("live_rounds").delete().eq("id", round_id).execute()
    return {"deleted": round_id}


@router.delete("/admin/sessions/{session_id}/ladder")
def delete_ladder(
    session_id: str,
    course_code: str = Query(..., min_length=1),
    section: str = Query(..., min_length=1),
    admin_id: str = Depends(current_admin_id),
):
    session_id = _uuid_or_400(session_id, "session_id")
    sb = get_client()

    ladder = _ladder_rounds(sb, session_id, course_code, section)
    if not ladder:
        raise HTTPException(status_code=404, detail="Ladder not found")

    non_draft = [r for r in ladder if r["status"] != "draft"]
    if non_draft:
        raise HTTPException(
            status_code=409,
            detail=f"{len(non_draft)} round(s) are open or closed — delete the session instead",
        )

    logger.warning(
        "deleting ladder admin=%s session=%s course=%s %s rounds=%s",
        admin_id,
        session_id,
        course_code,
        section,
        len(ladder),
    )
    sb.table("live_rounds").delete().in_("id", [r["id"] for r in ladder]).execute()
    return {"deleted": len(ladder)}


@router.delete("/admin/sessions/{session_id}")
def delete_session(
    session_id: str,
    force: bool = Query(False),
    admin_id: str = Depends(current_admin_id),
):
    """Cascades to every round and bid beneath the session (migration 005)."""
    session_id = _uuid_or_400(session_id, "session_id")
    sb = get_client()

    if not sb.table("live_sessions").select("id").eq("id", session_id).limit(1).execute().data:
        raise HTTPException(status_code=404, detail="Session not found")

    rounds = (
        sb.table("live_rounds")
        .select("id, status")
        .eq("session_id", session_id)
        .execute()
        .data
    )
    if any(r["status"] == "open" for r in rounds):
        raise HTTPException(
            status_code=409, detail="Close the open round before deleting this session"
        )

    bid_count = 0
    if rounds:
        bid_count = len(
            sb.table("live_bids")
            .select("id")
            .in_("round_id", [r["id"] for r in rounds])
            .execute()
            .data
        )
    if bid_count and not force:
        raise HTTPException(
            status_code=409,
            detail=f"Session holds {bid_count} real bid(s) — re-send with force=true to delete",
        )

    logger.warning(
        "deleting session admin=%s session=%s rounds=%s bids=%s force=%s",
        admin_id,
        session_id,
        len(rounds),
        bid_count,
        force,
    )
    sb.table("live_sessions").delete().eq("id", session_id).execute()
    return {"deleted": session_id, "rounds": len(rounds), "bids": bid_count}
