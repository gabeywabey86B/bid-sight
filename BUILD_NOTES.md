# BidSight — Build Notes

Living doc for the team. Records *why* things are the way they are so we don't
re-argue settled decisions.

## Product shape (settled after design review)

- **Training Mode is the product.** Solo skill trainer on historical BOSS data.
  Predict a section's **median** (and/or **min**) bid; get an instant closeness
  score. Reputation here is **private** — for your own improvement. Because the
  reward is self-knowledge, looking up the public answer only fools yourself, so
  cheating needs no heavy prevention.
- **Live Mode is a sub-feature.** Users predict upcoming real rounds; crowd
  consensus + scoring revealed **after** BOSS publishes results. This is the
  *only* place stakes/prizes are legitimate, because the answer doesn't exist
  yet at prediction time.
- **Prediction target:** median AND min. Median = market center; min = what you
  must beat to win at all. Median alone trains the wrong number for "bid
  efficiently." (Efficiency = smallest bid that still wins.)

## Open items the pitch must answer

1. **Transfer proof.** "Training improves real bidding" is still unvalidated.
   Plan: validation interviews + a before/after accuracy check. This is the
   differentiator, not an afterthought.
2. **Seasonality.** Bidding is ~2x/year; the competitive layer is data-thin
   per user. Decide deliberately: accept it's seasonal, or design an off-season
   feature (e.g. course/prof reviews).

## Scoring (see backend/app/scoring.py)

- **Percentage** error, not dollars (fair across price levels).
- `score = 100 / (1 + K * error_pct)`, K default 5.0. Perfect = 100; penalty
  flattens far away so the leaderboard is decided by near-bullseyes.
- TODO: tune K against the real Round-1, median>0 distribution
  (avg median ~$31.6, p50 ~$26, max ~$355, ~33k eligible sections).

## Architecture

- **React (Vite)** — Supabase Auth only (anon key, browser-safe).
- **FastAPI** — all trusted logic: serves answer-free training rounds, computes
  scores (server-authoritative), aggregates live consensus, reads/writes via the
  Supabase **service-role** key. This is the real reason for a Python backend,
  not cheat-prevention.
- **Supabase Postgres** — source of truth.

### Data model
- `bidding_table_info` (191k rows) / `section_info` (11k) — raw scraped data,
  already loaded. RLS on, **no policies on purpose**: only the service-role
  backend can read the withheld bid columns.
- `profiles` — 1:1 with auth.users (trigger auto-creates on signup).
- `predictions` — every guess. Clients can only READ their own; all writes come
  from the backend, keeping scoring authoritative.

## Run locally

Backend:
```
cd backend
python -m venv .venv && .venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env   # fill in SUPABASE_SERVICE_ROLE_KEY + SUPABASE_JWT_SECRET
uvicorn app.main:app --reload
# docs at http://localhost:8000/docs
```

Frontend (scaffold not yet generated — see next steps):
```
cd frontend
npm install
npm run dev
```
