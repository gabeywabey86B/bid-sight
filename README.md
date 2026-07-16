# BidSight: Training Leaderboard

---

## Status

**Live:** Training Mode, Accounts + Sign-in, Live-updating Leaderboard (all-time, weekly, top scores)  
**In progress:** Accuracy breakdown by course, AI coach, Live Round Mode

---

## What is Training Mode?

You load a historical BOSS bidding round. The real outcome (what the minimum or median bid actually was) is **hidden**. You see:

- Course code \+ section  
- Professor name  
- Class timing  
- Past trend (what did this same course cost last semester, 2 semesters ago?)  
- Number of spots available

You predict: **the exact median (or minimum) winning bid**, typed as a number. You click submit. The screen **reveals the actual bid** and **grades your guess on a 0–1.0 scale** — 1.0 is a perfect bullseye, and the score decays the further you are from the actual bid (see Scoring Engine below). Your score gets recorded.

Example flow:

\[HIDDEN OUTCOME MODE\]

CS101-A, Dr. Smith, 8:15 AM, 40 spots

Last semester min: e$18.50, last year min: e$17.00

Your prediction: \[ e$22.00 \] \[SUBMIT\]

\[REVEAL\]

Actual minimum bid: e$22.40

Error: 1.8% — Score: **0.92 / 1.0**

(If you've already played this course, you'll see "Replay — practice only" and the score won't count toward the leaderboard.)

\[NEXT SECTION\] \[VIEW LEADERBOARD\]

That's it. One screen. One interaction. One immediate feedback loop.

---

## Features Ranked by Priority

### Tier 1: Core (must have, makes the idea work)

| Feature | What it does | Why it matters |
| :---- | :---- | :---- |
| **Training Mode** | Pick a historical round, hide outcome, guess the exact median/min bid, reveal \+ score | This IS the product. Everything else is supporting structure. |
| **Dataset** | \~50-100 historical course sections with real min/median bid data | Training Mode has nothing to play without this. |
| **Prediction scoring** | Grade your guess 0–1.0 by how close it is to the real bid (percent error, inverse curve) | Feedback is the entire mechanism. No feedback \= no skill building. |

### Tier 2: Engagement (significantly better UX, necessary for a real product, optional for a tight demo)

| Feature | What it does | Why it matters | Status |
| :---- | :---- | :---- | :---- |
| **Running score tracker** | Shows your average score and rolling average (last 5) as you play | Lets you see your improvement in real time. Addictive. | ✓ Done |
| **Accounts \+ sign-in** (Supabase Auth) | You log in, your predictions persist across sessions | Without this, every time you reload the page your score resets. Kills replay value. | ✓ Done |
| **Leaderboard** | **All-time board** (avg score, ≥10 games), **This week** (resets Mon 00:00 SGT, ≥3 games), **Top scores** (single-prediction leaderboard). **School tabs**: every board also filterable per school (SCIS, SOE, LKCSB, …) with lower bars (≥5 all-time / ≥2 weekly). Only first attempt per course counts; replays are playable but excluded. Live updates every 15s. | Fair ranking enforced at write-time, not read-time. Prevents farming single courses or cheating via re-submission. School tabs give smaller, more reachable ladders. | ✓ Done |
| **Streak counter** | "X predictions in a row correct" | Psychological hook. People chase streaks. | Planned (Tier 3) |

### Tier 3: Nice-to-have (polish, cut if time pressure)

| Feature | What it does | Why it matters |
| :---- | :---- | :---- |
| **Accuracy by course category** | You can see "I'm 80% accurate on CS, 60% on humanities" | Helps you understand where your intuition is sharp and where it's soft. |
| **AI coach (optional)** | Simple explanation: "This went high because morning classes are always expensive" | Makes you learn *why*, not just *that*. Anthropic API call, treat as optional. |
| **Difficulty selector** | Easy \= use median bid, Hard \= use minimum bid | Lets you pick your skill level. Nice but not necessary. |

### Tier 4: 
| Feature | What it does | Why it matters | Status |
| :---- | :---- | :---- | :---- |
| **Live Round Mode** | Real upcoming BOSS round opens, live predictions, crowd consensus | The full product idea. | **Vision slide only.** Not built. |
| **Anonymous data collection** | Users submit grades, internship placements, LOA, exchange info | Broadens the platform. | **Cut entirely.** No ground truth, no enforcement. |

---

## Architecture: Scoring & Leaderboard

### Scoring Engine
- **Formula:** `score = 1 / (1 + K × error_pct)` where `K=5` (tunable)  
- **Error:** percentage error relative to actual bid (so a $3 miss on a $12 course is penalized harder than $3 on a $60 course)  
- **Result:** 1.0 at perfect guess, decay toward 0, flattening for wild misses (top of board decided by near-bullseyes, not "least wrong"). Reference points at K=5: 10% off → 0.67, 20% off → 0.50, 50% off → 0.29, 100% off → 0.17

### Leaderboard Integrity
- **Write-time counting:** Every training submission records `course_code` (from the truth query) and checks: is there a prior *counted* prediction by this user on that course? If yes, `counted=false` (replay). If no, `counted=true` (first attempt).
- **Why at write-time:** UI must show "Replay — practice only" instantly on the reveal, before the leaderboard updates. Backend determines counted-ness at submit.
- **Board formula:** `avg_score DESC, filtered by counted=true && mode='training'`
- **School tabs:** `school_department` is denormalized onto each prediction at write time (mirroring `course_code`), and both leaderboard RPCs take an optional `p_school` filter. The tab list reuses the training filter's `/training/schools` endpoint.
- **Weekly reset:** No cron job. SQL function filters `created_at >= date_trunc('week', now() AT TIME ZONE 'Asia/Singapore')` — resets every Monday 00:00 SGT.
- **Minimum eligibility:** Global boards: all-time ≥10 counted predictions, weekly ≥3. Per-school boards: ≥5 / ≥2 (rounds are dealt randomly across schools, so per-school counts grow slower). Thresholds live in the router.

### Why This Matters
After reveal, a user could naively re-submit the exact answer for a perfect 1.0—this was acceptable when the leaderboard was private. Public leaderboard + instant updates make that unfair. The write-time `counted` flag (keyed off server-derived `course_code` + user identity) prevents both re-submission farming and single-course grinding.

---

## Local Setup & Deployment

### Prerequisites
- **Python 3.9+** (`python --version`)
- **Node.js 18+** (`node --version`)
- **Supabase project** with credentials (URL, service role key, anon key)
- **Git** repository access

### Step 1: Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/gabeywabey86B/bid-sight.git
cd bid-sight

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install

# Return to repo root
cd ..
```

### Step 2: Supabase Migrations (One-time setup)

Go to **Supabase Dashboard → SQL Editor** and run these migrations in order (each in its own query):

#### Migration 001: Leaderboard Schema
1. Copy and paste the entire contents of `backend/sql/001_leaderboard.sql`
2. Click **Run** — this adds the `course_code`, `counted` columns and creates the base leaderboard RPCs

#### Migration 002: Score Rescale & School Tabs (Recent update)
1. Copy and paste the entire contents of `backend/sql/002_score_rescale_school_leaderboards.sql`
2. Click **Run** — this rescales all scores to 0–1.0, adds `school_department`, and updates RPCs with school filtering
3. Verify by running:
   ```sql
   select min(score), max(score) from predictions where score is not null;
   -- Should show: min=0.0XX, max=0.9XX (all within [0, 1])
   
   select count(*) from predictions where course_code is not null and school_department is null;
   -- Should show: 0 (or only orphaned rows with no matching course)
   ```

### Step 3: Environment Setup

Create `.env` or set environment variables:

#### Backend (`backend/`)
```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Service Role Key from Supabase
export FRONTEND_ORIGIN=http://localhost:5173
export SCORING_K=5.0  # Optional: tuning knob for score curve
```

On Windows (PowerShell):
```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGc..."
$env:FRONTEND_ORIGIN = "http://localhost:5173"
```

#### Frontend (`frontend/`)
```bash
export VITE_API_URL=http://localhost:8000
export VITE_SUPABASE_URL=https://your-project.supabase.co
export VITE_SUPABASE_ANON_KEY=eyJhbGc...  # Anon Key from Supabase
```

On Windows:
```powershell
$env:VITE_API_URL = "http://localhost:8000"
$env:VITE_SUPABASE_URL = "https://your-project.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "eyJhbGc..."
```

### Step 4: Run Backend

```bash
cd backend
uvicorn app.main:app --reload
```

**Output:** `INFO: Application startup complete` at `http://localhost:8000`  
**API Docs:** Visit `http://localhost:8000/docs` (Swagger UI)

### Step 5: Run Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

**Output:** `Local: http://localhost:5173/`  
**Open:** http://localhost:5173 in your browser

### Step 6: Test the Full Flow

1. **Sign up** with Supabase Auth (email/password or OAuth)
2. **Train Mode:** Click "Get a section", enter a guess (numeric), click Submit
3. **Reveal:** Check that score displays as `0.XX / 1.0` (e.g. `0.92 / 1.0`)
4. **Replay:** Guess the same course again — it should show "Replay — practice only" badge
5. **Leaderboard:** Click "Leaderboard" tab, verify:
   - "All" board shows all players (≥10 counted predictions)
   - School tabs (SCIS, SOE, etc.) appear and filter correctly
   - Switching tabs updates immediately
6. **Live polling:** Open leaderboard in two browser windows, submit a prediction in one, watch the other update within 15s

### Verification Checklist

After first run:
- [ ] Backend starts without errors (check `/health`)
- [ ] Frontend connects (check browser console for no CORS errors)
- [ ] Can sign up / log in
- [ ] Training round loads with hidden answer
- [ ] Submit prediction → reveal shows score `0.XX / 1.0` and `≤ 0.7` displays as red
- [ ] Leaderboard has all three boards (all-time, weekly, top scores)
- [ ] Leaderboard has school tabs; switching tabs refetches
- [ ] Own row on leaderboard highlights
- [ ] Replay badge appears on second submission for same course
- [ ] Progress page shows rolling average and sparkline

### Troubleshooting

| Issue | Solution |
| :---- | :---- |
| `SUPABASE_URL not set` | Check env vars: `echo $SUPABASE_URL` (or `$env:SUPABASE_URL` on Windows) |
| `CORS error in browser console` | Verify `FRONTEND_ORIGIN` matches the frontend URL (http://localhost:5173 for local dev) |
| `401 Unauthorized` on `/leaderboard` | Supabase Auth JWT is missing; reload page and sign in again |
| `PostgreSQL function not found` | Run migration 001 and 002 in Supabase SQL editor (check for errors) |
| `Scores show as 100.00 / 100` | Migration 002 hasn't been run yet; existing rows use old 0–100 scale |
| `School tabs don't filter` | Backend may be old code; restart with `uvicorn --reload` |

---

## Roadmap

### Phase 1: Immediate Wins
- **Streak counter** (Tier 2): Track consecutive correct predictions on progress page
- **Accuracy by category** (Tier 3): Slice leaderboard and personal progress by school or course type
- **Endpoint optimization:** 30s in-process TTL cache on `/leaderboard`, measure polling latency vs. Supabase Realtime

### Phase 2: Scale & Depth
- **Live Round Mode** (Tier 4): Real upcoming BOSS windows, live predictions, crowd consensus after results
- **AI coach** (optional Tier 3): LLM-generated insight (e.g., "Morning classes bid higher") — Anthropic API integration
- ~~**School-level leaderboards:** Narrower competition scope per SMU department~~ ✓ Done (school tabs on the leaderboard)

### Phase 3: Vision
- Expand to other university bidding systems
- Integrate with academic advising tools for enrollment prep
- Advanced analytics (accuracy trends, course difficulty heatmaps, bid prediction confidence)

---

## Tech Stack

- **Frontend:** React \+ Vite (SF Pro Display / JetBrains Mono for numerals, system-native design)  
- **Backend:** FastAPI (Supabase Auth, Postgres for predictions + RPC leaderboards)  
- **Hosting:** Vercel (frontend), Supabase (backend)  
- **Data:** \~50-100 curated historical BOSS rounds with real min/median bid data

---
