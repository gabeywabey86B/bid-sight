"""Submit a prediction. The server owns the truth and the score.

Training: the actual value is known, so we look it up, score immediately with
the shared scoring engine, persist the full row, and return the reveal.

Live: the round hasn't resolved, so there is nothing to score yet — we persist
the guess with actual_value/score = NULL, to be filled in by a post-round job
once BOSS publishes results.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..auth import current_user_id
from ..config import get_settings
from ..scoring import score_prediction
from ..supabase_client import get_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predictions", tags=["predictions"])


class PredictionIn(BaseModel):
    course_id: str
    bidding_window: str
    target: str = Field(pattern="^(median|min)$")
    mode: str = Field(pattern="^(training|live)$")
    predicted_value: float = Field(ge=0)


@router.post("")
def submit_prediction(body: PredictionIn, user_id: str = Depends(current_user_id)):
    # Layer 4: Debug Instrumentation — log before any irreversible operation
    logger.debug(
        "submit_prediction called",
        extra={
            "user_id": user_id,
            "course_id": body.course_id,
            "target": body.target,
            "mode": body.mode,
            "predicted_value": body.predicted_value,
        },
    )

    sb = get_client()
    col = "median_bid" if body.target == "median" else "min_bid"

    row = {
        "user_id": user_id,
        "course_id": body.course_id,
        "bidding_window": body.bidding_window,
        "target": body.target,
        "mode": body.mode,
        "predicted_value": body.predicted_value,
        "actual_value": None,
        "error_pct": None,
        "score": None,
        "course_code": None,
        "school_department": None,
        "counted": False,
    }

    if body.mode == "training":
        truth = (
            sb.table("bidding_table_info")
            .select(f"{col}, course_code, school_department")
            .eq("course_id", body.course_id)
            .eq("bidding_window", body.bidding_window)
            .limit(1)
            .execute()
            .data
        )
        if not truth or truth[0][col] in (None, 0):
            logger.warning(
                "Section has no eligible outcome",
                extra={
                    "course_id": body.course_id,
                    "column": col,
                    "truth": truth,
                },
            )
            raise HTTPException(status_code=404, detail="Section has no eligible outcome")
        actual = float(truth[0][col])
        result = score_prediction(body.predicted_value, actual, k=get_settings().SCORING_K)
        course_code = truth[0].get("course_code")
        row.update(
            actual_value=actual,
            course_code=course_code,
            school_department=truth[0].get("school_department"),
            **result,
        )

        if course_code:
            prior = (
                sb.table("predictions")
                .select("id")
                .eq("user_id", user_id)
                .eq("course_code", course_code)
                .eq("target", body.target)
                .eq("mode", "training")
                .eq("counted", True)
                .limit(1)
                .execute()
                .data
            )
            row["counted"] = not prior

    inserted = sb.table("predictions").insert(row).execute().data[0]
    # For live, the reveal fields are null; the client just shows "submitted".
    return {
        "id": inserted["id"],
        "mode": body.mode,
        "predicted_value": body.predicted_value,
        "actual_value": row["actual_value"],
        "error_pct": row["error_pct"],
        "score": row["score"],
        "counted": row["counted"],
    }


@router.get("/me")
def my_predictions(user_id: str = Depends(current_user_id)):
    sb = get_client()
    rows = (
        sb.table("predictions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
        .data
    )
    scored = [r for r in rows if r["score"] is not None]
    avg = round(sum(r["score"] for r in scored) / len(scored), 3) if scored else None
    return {"count": len(rows), "avg_score": avg, "predictions": rows}
