"""Runtime configuration, loaded from environment (.env in dev)."""
from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Supabase project: https://app.supabase.com -> Project Settings -> API
    SUPABASE_URL: str = os.environ["SUPABASE_URL"]
    # service_role key — bypasses RLS. NEVER ship this to the frontend.
    SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    # CORS: where the React app runs.
    FRONTEND_ORIGIN: str = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")

    # Scoring sharpness (see scoring.py). Tune against the real distribution.
    SCORING_K: float = float(os.environ.get("SCORING_K", "5.0"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
