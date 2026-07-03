"""Scoring engine — the single source of truth for how good a guess is.

The whole product hinges on this being consistent and server-authoritative,
so it lives here and nowhere else (never re-implemented in the client).

Design (from the design review):
- Error is measured in PERCENT, not dollars, so a $3 miss on a $12 course is
  penalised harder than a $3 miss on a $60 course (fairer across price levels).
- The score is an inverse curve: 100 at a perfect guess, decaying toward 0,
  with the penalty *flattening* as you get further away (a wild miss and a
  slightly-less-wild miss score similarly low, so the top of the leaderboard is
  decided by near-bullseyes, not by who was "least insanely wrong").

    score = 100 / (1 + K * error_pct)

K is the sharpness knob. Higher K = steeper penalty near the target.
K should eventually be *tuned against the real median-bid distribution*
(Round 1, median > 0). K=5.0 is a sane default:
    10% off -> 66.7    20% off -> 50.0    50% off -> 28.6    100% off -> 16.7
"""

from __future__ import annotations

DEFAULT_K = 5.0


def percent_error(predicted: float, actual: float) -> float:
    """Absolute error as a fraction of the true value. actual must be > 0
    (we only ever serve sections with median/min > 0, so this holds)."""
    if actual <= 0:
        raise ValueError("actual must be > 0; undersubscribed sections are excluded")
    return abs(predicted - actual) / actual


def score_prediction(predicted: float, actual: float, k: float = DEFAULT_K) -> dict:
    """Return the error_pct (0-1) and the 0-100 score for one guess."""
    err = percent_error(predicted, actual)
    score = 100.0 / (1.0 + k * err)
    return {"error_pct": round(err, 4), "score": round(score, 2)}
