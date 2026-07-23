"""A single service-role Supabase client for the whole backend.

Service role bypasses RLS, which is exactly why all trusted writes
(actual_value, score) and all reads of the withheld bid data go through here
and never through the browser.
"""
from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings


@lru_cache
def get_client() -> Client:
    s = get_settings()
    return create_client(s.SUPABASE_URL, s.SUPABASE_SERVICE_ROLE_KEY)
