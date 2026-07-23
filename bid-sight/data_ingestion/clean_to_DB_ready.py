"""Transform raw bidding CSVs into DB-ready CSVs.

Two kinds of source files are handled, paired by term:
  * main bid data:   202x_xx_Term_x.csv          (e.g. 2024_25_Term_1.csv)
  * section info:    202x_xx_Termx_section_info.csv (e.g. 2024_25_Term1_section_info.csv)

A CourseID is generated/aligned across both so the section-info CourseID
(primary key) and the bid-data CourseID (foreign key) match.
The term portion of the CourseID and every filename are derived from the
filename pattern -- nothing is hard-coded per term.
"""

import csv
import re
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths / patterns
# ---------------------------------------------------------------------------
SRC_DIR = Path(__file__).resolve().parent
OUT_DIR = SRC_DIR / "db_ready"

# 2024_25_Term_1.csv  -> main bid data
MAIN_RE = re.compile(r"^(\d{4})_(\d{2})_Term_(\d)\.csv$", re.IGNORECASE)
# 2024_25_Term1_section_info.csv -> section info
SECTION_RE = re.compile(r"^(\d{4})_(\d{2})_Term(\d)_section_info\.csv$", re.IGNORECASE)

# Positional columns of the raw main file (it has no header; row 0 is junk).
RAW_MAIN_COLS = [
    "Term",
    "Session Bidding Window",   # raw: "Regular Academic Session"
    "Bidding window",           # raw: "Round 2A Window 3"
    "Course Code",
    "Description",
    "Section",                  # raw: "G1 | https://..." -> split into Section + Url
    "Median Bid",
    "Min Bid",
    "Vacancy",
    "Opening Vacancy",
    "Before Process Vacancy",
    "After Process Vacancy",
    "D.I.C.E",
    "Enrolled Students",
    "Instructor",
    "School/Department",
]

# Final column order for the DB-ready main file (snake_case to match DB schema).
MAIN_OUT_COLS = [
    "bidding_window",
    "course_id",
    "term",
    "session_bidding_window",
    "course_code",
    "description",
    "section",
    "median_bid",
    "min_bid",
    "vacancy",
    "opening_vacancy",
    "before_process_vacancy",
    "after_process_vacancy",
    "dice",
    "enrolled_students",
    "instructor",
    "school_department",
    "url",
]

# Maps raw column names (from RAW_MAIN_COLS) to DB snake_case names.
COL_RENAME = {
    "Bidding window":           "bidding_window",
    "CourseID":                 "course_id",
    "Term":                     "term",
    "Session Bidding Window":   "session_bidding_window",
    "Course Code":              "course_code",
    "Description":              "description",
    "Section":                  "section",
    "Median Bid":               "median_bid",
    "Min Bid":                  "min_bid",
    "Vacancy":                  "vacancy",
    "Opening Vacancy":          "opening_vacancy",
    "Before Process Vacancy":   "before_process_vacancy",
    "After Process Vacancy":    "after_process_vacancy",
    "D.I.C.E":                  "dice",
    "Enrolled Students":        "enrolled_students",
    "Instructor":               "instructor",
    "School/Department":        "school_department",
    "Url":                      "url",
}


def term_code(year1: str, year2: str, term_no: str) -> str:
    """('2024', '25', '1') -> '24_25T1'."""
    return f"{year1[2:]}_{year2}T{term_no}"


def split_section(raw: str) -> tuple[str, str]:
    """'G2 | https://...' -> ('G2', 'https://...'). Url may be empty."""
    parts = raw.split("|", 1)
    section = parts[0].strip().upper()
    url = parts[1].strip() if len(parts) > 1 else ""
    return section, url


def transform_main(path: Path, tcode: str, out_path: Path) -> int:
    """Read raw main bid CSV, write DB-ready CSV. Returns row count."""
    n = 0
    with open(path, encoding="utf-8", newline="") as fin, \
         open(out_path, "w", encoding="utf-8", newline="") as fout:
        reader = csv.reader(fin)
        writer = csv.DictWriter(fout, fieldnames=MAIN_OUT_COLS)
        writer.writeheader()
        next(reader, None)  # skip the unwanted "Data pager" first row
        for raw in reader:
            if len(raw) != len(RAW_MAIN_COLS):
                continue  # skip malformed / blank lines
            row = dict(zip(RAW_MAIN_COLS, raw))
            section, url = split_section(row["Section"])
            row["Section"] = section
            row["Url"] = url
            row["Median Bid"] = None if row["Median Bid"].strip() == "-" else row["Median Bid"]
            row["CourseID"] = f"{tcode}|{row['Course Code']}{section}"
            renamed = {COL_RENAME[k]: v for k, v in row.items() if k in COL_RENAME}
            writer.writerow({c: renamed.get(c, "") for c in MAIN_OUT_COLS})
            n += 1
    return n


def transform_section(path: Path, tcode: str, out_path: Path) -> int:
    """Read section-info CSV, prefix its CourseID with the term code."""
    n = 0
    with open(path, encoding="utf-8", newline="") as fin, \
         open(out_path, "w", encoding="utf-8", newline="") as fout:
        reader = csv.reader(fin)
        header = next(reader)  # courseID,schedule,course_areas,url
        out_header = ["course_id"] + header[1:]
        writer = csv.writer(fout)
        writer.writerow(out_header)
        for raw in reader:
            if not raw:
                continue
            raw[0] = f"{tcode}|{raw[0].strip()}"
            writer.writerow(raw)
            n += 1
    return n


def main() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    processed = {}  # tcode -> {"main": count, "section": count}

    for path in sorted(SRC_DIR.glob("*.csv")):
        m = MAIN_RE.match(path.name)
        s = SECTION_RE.match(path.name)
        if m:
            tcode = term_code(*m.groups())
            out = OUT_DIR / f"{path.stem}_db_ready.csv"
            count = transform_main(path, tcode, out)
            processed.setdefault(tcode, {})["main"] = count
            print(f"[main]    {path.name} -> {out.name}  ({count} rows, term {tcode})")
        elif s:
            tcode = term_code(*s.groups())
            out = OUT_DIR / f"{path.stem}_db_ready.csv"
            count = transform_section(path, tcode, out)
            processed.setdefault(tcode, {})["section"] = count
            print(f"[section] {path.name} -> {out.name}  ({count} rows, term {tcode})")

    # Warn about terms missing one half of the pair.
    for tcode, kinds in sorted(processed.items()):
        if "main" not in kinds or "section" not in kinds:
            print(f"WARNING: term {tcode} is missing {'main' if 'main' not in kinds else 'section'} file")


if __name__ == "__main__":
    main()
