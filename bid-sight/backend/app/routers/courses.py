"""Search historical bidding data by course code.

Unlike /training/history (which excludes the active round's own section and
anything at/after its term so the training answer never leaks), this is a
plain lookup: any course code prefix, every term, every section on record.
"""
from __future__ import annotations

from fastapi import APIRouter, Query

from ..supabase_client import get_client

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/search")
def search_courses(
    q: str = Query(..., min_length=2, max_length=20),
    limit: int = Query(200, ge=1, le=500),
):
    sb = get_client()
    prefix = q.strip().upper()

    rows = (
        sb.table("bidding_table_info")
        .select(
            "course_id, term, course_code, description, section, bidding_window,"
            " instructor, school_department, vacancy, opening_vacancy, median_bid,"
            " min_bid"
        )
        .ilike("course_code", f"{prefix}%")
        .order("course_code")
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

    return {"query": prefix, "results": rows}
