"""Serve a training round WITHOUT the answer.

This is the one endpoint where withholding actually matters as clean design:
we select a random eligible historical section and return everything a player
needs to reason — course, professor, timing, vacancy — but strip median_bid /
min_bid so the reveal only happens after they submit (see predictions.py).
"""
from __future__ import annotations

import logging
import random

from fastapi import APIRouter, HTTPException, Query

from ..supabase_client import get_client

router = APIRouter(prefix="/training", tags=["training"])
logger = logging.getLogger(__name__)

# Content pool: Round 1 windows with a real (contested) median.
# Filter to recent terms (2024-25 onwards) to avoid stale bidding data.
_WINDOW_FILTER = "%Round 1%"
_RECENT_TERMS = ["2024-25", "2025-26", "2026-27"]  # Only serve recent academic years


@router.get("/schools")
def get_schools():
    """Distinct school_department values, for the training round school filter.

    Computed server-side via the training_schools() DB function instead of
    paging through all 191k rows in Python — that approach was slow and
    occasionally 500'd on a flaky read mid-loop.
    """
    sb = get_client()
    rows = sb.rpc("training_schools").execute().data
    return {"schools": [r["school_department"] for r in rows]}


@router.get("/round")
def get_training_round(
    target: str = Query("median", pattern="^(median|min)$"),
    school: str | None = Query(None),
):
    sb = get_client()

    def base_query(select: str, count: str | None = None):
        q = (
            sb.table("bidding_table_info")
            .select(select, count=count)
            .gt("median_bid", 0)
            .ilike("bidding_window", _WINDOW_FILTER)
        )
        # Layer 1: Filter to recent terms only (2025-26 onwards) to avoid stale data
        if _RECENT_TERMS:
            q = q.in_("term", _RECENT_TERMS)

        # Layer 2: Ensure school filter is applied if provided
        if school:
            q = q.eq("school_department", school)
        return q

    total = base_query("course_id", count="exact").execute().count or 0
    if total == 0:
        # Layer 3: Provide context-aware error messages
        detail = "No eligible training rounds"
        if school:
            detail += f" for {school}"
        if _RECENT_TERMS:
            detail += f" in recent terms ({', '.join(_RECENT_TERMS)})"
        raise HTTPException(status_code=503, detail=detail)

    offset = random.randint(0, total - 1)
    row = (
        base_query(
            "course_id, bidding_window, term, course_code, description, section,"
            " instructor, school_department, vacancy, opening_vacancy"
        )
        .range(offset, offset)
        .execute()
        .data[0]
    )

    # Enrich with schedule/course area from section_info (also answer-free).
    info = (
        sb.table("section_info")
        .select("schedule, course_areas")
        .eq("course_id", row["course_id"])
        .limit(1)
        .execute()
        .data
    )
    row["schedule"] = info[0]["schedule"] if info else None
    row["course_areas"] = info[0]["course_areas"] if info else None
    row["target"] = target  # what the user is asked to predict
    return row


@router.get("/history")
def get_course_history(
    course_code: str,
    exclude_course_id: str,
    before_term: str,
    limit: int = Query(50, ge=1, le=100),
):
    """Past bids for the same course (any section/term), as a reference for
    guessing. Excludes the exact section currently being predicted (so the
    answer for the active round is never leaked) and anything at or after
    `before_term` (so a 2022-23 Term 1 round can't be informed by 2022-23
    Term 2 data that wouldn't have existed yet).

    Term strings ("YYYY-YY Term N") sort correctly with plain `<` comparison
    since the year prefix and single-digit term number both compare
    lexicographically the same as chronologically.
    """
    sb = get_client()
    rows = (
        sb.table("bidding_table_info")
        .select(
            "course_id, term, section, bidding_window, instructor, vacancy,"
            " opening_vacancy, median_bid, min_bid"
        )
        .eq("course_code", course_code)
        .neq("course_id", exclude_course_id)
        .lt("term", before_term)
        .gt("median_bid", 0)
        .order("term", desc=True)
        .limit(limit)
        .execute()
        .data
    )

    course_ids = list({r["course_id"] for r in rows})
    schedules: dict[str, str] = {}
    if course_ids:
        info_rows = (
            sb.table("section_info")
            .select("course_id, schedule")
            .in_("course_id", course_ids)
            .execute()
            .data
        )
        schedules = {r["course_id"]: r["schedule"] for r in info_rows}

    for r in rows:
        r["schedule"] = schedules.get(r["course_id"])

    return {"course_code": course_code, "history": rows}
