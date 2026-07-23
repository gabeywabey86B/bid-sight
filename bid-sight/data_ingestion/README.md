# bidsidh — SMU BOSS Bidding Data Ingestion

A pipeline that scrapes SMU BOSS bidding results, enriches them with per-section schedule/course-area info, and produces clean CSVs ready for database import.

---

## Pipeline Overview

```
login_and_save_credentials.py   (one-time / when session expires)
         ↓
scraping.py                     scrape main bidding results → 202x_xx_Term_x.csv
         ↓
csv_processor.py                extract unique section URLs from bid CSV
         ↓
scrape_add_info.py              visit each section URL → 202x_xx_Termx_section_info.csv
         ↓
clean_to_DB_ready.py            transform both CSVs → db_ready/
```

---

## Scripts

| Script | Purpose |
|---|---|
| `login_and_save_credentials.py` | Opens a browser for manual login; saves the authenticated session to `auth.json` |
| `scraping.py` | Paginates through BOSS Overall Results for a given term and writes raw bid data to a CSV |
| `csv_processor.py` | Reads a raw bid CSV, extracts unique section URLs, and kicks off `scrape_add_info` |
| `scrape_add_info.py` | Visits each section detail page and appends schedule + course area data to a section-info CSV |
| `clean_to_DB_ready.py` | Batch-transforms all raw CSVs in the project root into DB-ready CSVs under `db_ready/` |

---

## File Naming Conventions

| Pattern | Example | Contents |
|---|---|---|
| `YYYY_YY_Term_N.csv` | `2024_25_Term_1.csv` | Raw bidding results (main) |
| `YYYY_YYTermN_section_info.csv` | `2024_25Term1_section_info.csv` | Per-section schedule & course areas |
| `db_ready/*_db_ready.csv` | `db_ready/2024_25_Term_1_db_ready.csv` | DB-ready output |

---

## Setup

```bash
# Install uv (if not already installed)
pip install uv

# Install dependencies
uv sync

# Install Playwright browsers (first time only)
uv run playwright install chromium
```

---

## Usage

### 1. Save your session (run when session expires)

```bash
uv run python login_and_save_credentials.py
```

Log in manually in the browser window that opens, then press Enter. This saves `auth.json`.

### 2. Scrape bidding results

Edit the `OUTPUT_FILE` and `select_term(...)` call in `scraping.py`, then:

```bash
uv run python scraping.py
```

### 3. Scrape section detail pages

Edit `FILE_TO_READ` and `OUTPUT_FILE` in `csv_processor.py` to match the term, then:

```bash
uv run python csv_processor.py
```

### 4. Transform to DB-ready CSVs

```bash
uv run python clean_to_DB_ready.py
```

Output lands in `db_ready/`. A warning is printed for any term missing one of its two source files.

---

## Output Schema

### Main bid data (`db_ready/*_Term_*_db_ready.csv`)

| Column | Description |
|---|---|
| `course_id` | Primary key — `YY_YYT{N}\|{CourseCode}{Section}` |
| `bidding_window` | e.g. `Round 2A Window 3` |
| `term` | e.g. `2024-25 Term 1` |
| `session_bidding_window` | e.g. `Regular Academic Session` |
| `course_code` | e.g. `IS111` |
| `description` | Course title |
| `section` | e.g. `G1` |
| `median_bid` / `min_bid` | Bid prices (null if `-`) |
| `vacancy` / `opening_vacancy` / `before_process_vacancy` / `after_process_vacancy` | Seat counts |
| `dice` | D.I.C.E flag |
| `enrolled_students` | Number enrolled |
| `instructor` | Instructor name |
| `school_department` | Offering school/department |
| `url` | Direct link to section detail page |

### Section info (`db_ready/*_section_info_db_ready.csv`)

| Column | Description |
|---|---|
| `course_id` | Foreign key matching the main table |
| `schedule` | Pipe-separated class meetings, e.g. `Day: Mon, start time: 08:15, end time: 09:30` |
| `course_areas` | Pipe-separated curriculum areas |
| `url` | Section detail URL |

---

## Dependencies

- Python >= 3.13
- `playwright` — browser automation
- `beautifulsoup4` — HTML parsing
- `pandas` — CSV processing in `csv_processor.py`
- `psycopg2-binary` — PostgreSQL client (for DB import)
- `python-dotenv` — environment variable management
