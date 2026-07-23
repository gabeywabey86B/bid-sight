"""BidSight API — FastAPI entrypoint."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import courses, friends, leaderboard, live, predictions, profiles, training

app = FastAPI(title="BidSight API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(training.router)
app.include_router(predictions.router)
app.include_router(leaderboard.router)
app.include_router(courses.router)
app.include_router(profiles.router)
app.include_router(friends.router)
app.include_router(live.router)


@app.get("/health")
def health():
    return {"status": "ok"}
