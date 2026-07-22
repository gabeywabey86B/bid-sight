import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import BidHistoryChart from "../components/BidHistoryChart";
import { useApi } from "../lib/useApi";

// "Day: Tue, start time: 15:30,end time : 17:00|Day: Thu, start time: 15:30,end time : 17:00"
// -> { day: "Tue, Thu", timing: "15:30-17:00, 15:30-17:00" }
function parseSchedule(schedule) {
  if (!schedule) return { day: "", timing: "" };
  const slots = schedule.split("|").map((slot) => {
    const day = slot.match(/Day:\s*([^,]+)/)?.[1]?.trim() ?? "";
    const start = slot.match(/start time:\s*([\d:]+)/)?.[1] ?? "";
    const end = slot.match(/end time\s*:\s*([\d:]+)/)?.[1] ?? "";
    return { day, timing: start && end ? `${start}-${end}` : "" };
  });
  return {
    day: slots.map((s) => s.day).join(", "),
    timing: slots.map((s) => s.timing).join(", "),
  };
}

// Columns with a multi-select filter in the header.
const FILTER_COLUMNS = [
  { key: "term", label: "Term" },
  { key: "section", label: "Section" },
  { key: "bidding_window", label: "Window" },
  { key: "day", label: "Day" },
  { key: "timing", label: "Timing" },
  { key: "instructor", label: "Instructor" },
  { key: "vacancy", label: "Vacancy" },
  { key: "opening_vacancy", label: "Opening" },
];

// Columns with asc/desc sort instead of a filter.
const SORT_COLUMNS = [
  { key: "median_bid", label: "Median" },
  { key: "min_bid", label: "Min" },
];

const HISTORY_COLUMNS = [...FILTER_COLUMNS, ...SORT_COLUMNS];

const NUMERIC_COLUMNS = new Set(["vacancy", "opening_vacancy", "median_bid", "min_bid"]);

function MultiSelectFilter({ label, options, selected, onChange }) {
  const summary = selected.length === 0 ? "All" : `${selected.length} selected`;
  const detailsRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (detailsRef.current && !detailsRef.current.contains(e.target)) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(value) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  }

  return (
    <details className="multiselect" ref={detailsRef}>
      <summary>{summary}</summary>
      <div className="multiselect-menu">
        <div className="multiselect-actions">
          <button type="button" className="link-button" onClick={() => onChange([])}>
            Clear
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => (detailsRef.current.open = false)}
          >
            Done
          </button>
        </div>
        {options.map((value) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => toggle(value)}
            />
            {value}
          </label>
        ))}
      </div>
    </details>
  );
}

export default function TrainingPage() {
  const [target, setTarget] = useState("median");
  const { data: schoolsData } = useApi(api.getSchools);
  const schools = schoolsData?.schools ?? [];
  const [school, setSchool] = useState("");
  const [round, setRound] = useState(null);
  const [history, setHistory] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const rows = useMemo(() => {
    if (!history) return [];
    return history.map((h) => {
      const { day, timing } = parseSchedule(h.schedule);
      return {
        ...h,
        day,
        timing,
        median_bid: h.median_bid?.toFixed(2) ?? "",
        min_bid: h.min_bid?.toFixed(2) ?? "",
      };
    });
  }, [history]);

  const columnOptions = useMemo(() => {
    const options = {};
    for (const { key } of FILTER_COLUMNS) {
      const values = new Set(rows.map((r) => String(r[key] ?? "")).filter(Boolean));
      options[key] = Array.from(values).sort();
    }
    return options;
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) =>
      FILTER_COLUMNS.every(({ key }) => {
        const selected = columnFilters[key];
        if (!selected || selected.length === 0) return true;
        return selected.includes(String(r[key] ?? ""));
      })
    );
  }, [rows, columnFilters]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filteredRows;
    const sorted = [...filteredRows].sort((a, b) => {
      const av = parseFloat(a[sortConfig.key]) || 0;
      const bv = parseFloat(b[sortConfig.key]) || 0;
      return av - bv;
    });
    if (sortConfig.direction === "desc") sorted.reverse();
    return sorted;
  }, [filteredRows, sortConfig]);

  function setColumnFilter(key, values) {
    setColumnFilters((prev) => ({ ...prev, [key]: values }));
  }

  function resetFilters() {
    setColumnFilters({});
    setSortConfig({ key: null, direction: "asc" });
  }

  function toggleSort(key) {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
    });
  }

  const activeFilterCount = Object.values(columnFilters).filter((v) => v && v.length > 0).length;

  async function loadRound(nextTarget = target, nextSchool = school) {
    // Layer 1: Entry Point Validation — reject invalid input immediately
    if (!nextTarget || !["median", "min"].includes(nextTarget)) {
      setError("Invalid target: please select Median or Minimum");
      return;
    }
    if (nextSchool && typeof nextSchool !== "string") {
      setError("Invalid school selection");
      return;
    }

    setError(null);
    setResult(null);
    setHistory(null);
    setColumnFilters({});
    setSortConfig({ key: null, direction: "asc" });
    setGuess("");
    setLoading(true);
    try {
      const data = await api.getTrainingRound(nextTarget, nextSchool || null);

      // Layer 2: Business Logic Validation — check that we got usable data
      if (!data || !data.course_id) {
        setError("Invalid response from server: missing course data");
        return;
      }

      setRound(data);
      api
        .getCourseHistory(data.course_code, data.course_id, data.term)
        .then((h) => setHistory(h.history))
        .catch((err) => {
          console.warn("Failed to load course history:", err);
          setHistory([]); // Allow the user to continue without history
        });
    } catch (err) {
      // Layer 4: Debug Instrumentation — log detailed error for diagnosis
      console.error("Failed to load training round", {
        target: nextTarget,
        school: nextSchool,
        error: err.message,
        stack: err.stack,
      });

      // Layer 3: Environment Guard — provide context-aware error messages
      if (err.message.includes("503")) {
        setError(
          `No eligible courses available${nextSchool ? ` for ${nextSchool}` : ""}. Try a different school or time back.`
        );
      } else if (err.message.includes("401")) {
        setError("Your session has expired. Please log in again.");
      } else if (err.message.includes("Network") || err.message.includes("fetch")) {
        setError("Network error: cannot reach server. Please check your connection.");
      } else {
        setError(`Failed to load round: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Layer 1: Entry Point Validation
    if (!round) {
      setError("No round loaded. Please click 'Get a section' first.");
      return;
    }
    if (!guess || guess.trim() === "") {
      setError("Please enter a guess before submitting.");
      return;
    }

    const guessNum = Number(guess);
    if (isNaN(guessNum)) {
      setError("Guess must be a valid number.");
      return;
    }
    if (guessNum < 0) {
      setError("Guess cannot be negative.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.submitPrediction({
        course_id: round.course_id,
        bidding_window: round.bidding_window,
        target,
        mode: "training",
        predicted_value: guessNum,
      });

      // Layer 2: Business Logic Validation
      if (!res || typeof res.score !== "number") {
        setError("Invalid response from server: missing score");
        return;
      }

      setResult(res);
    } catch (err) {
      console.error("Failed to submit prediction", {
        courseId: round.course_id,
        target,
        guess: guessNum,
        error: err.message,
      });

      if (err.message.includes("404")) {
        setError("This section is no longer available. Please get a new one.");
      } else if (err.message.includes("401")) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(`Failed to submit: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function switchTarget(newTarget) {
    setTarget(newTarget);
    if (round) loadRound(newTarget, school);
  }

  function switchSchool(newSchool) {
    setSchool(newSchool);
    if (round) loadRound(target, newSchool);
  }

  return (
    <div className="training-page">
      <h2>Training Mode</h2>
      <p className="tagline">
        Guess the {target === "median" ? "median" : "minimum"} winning bid for this
        section. No stakes, just skill.
      </p>

      <div className="target-toggle">
        <button
          className={target === "median" ? "active" : ""}
          onClick={() => switchTarget("median")}
        >
          Median
        </button>
        <button
          className={target === "min" ? "active" : ""}
          onClick={() => switchTarget("min")}
        >
          Minimum
        </button>
      </div>

      <div className="school-filter">
        <label htmlFor="school-select">School</label>
        <select
          id="school-select"
          value={school}
          onChange={(e) => switchSchool(e.target.value)}
        >
          <option value="">All schools</option>
          {schools.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {!round && (
        <button className="btn-primary" onClick={() => loadRound()} disabled={loading}>
          {loading ? "Loading..." : "Get a section"}
        </button>
      )}

      {error && <p className="error">{error}</p>}

      {round && (
        <div className="round-card">
          <h3>
            {round.course_code} {round.section} — {round.description}
          </h3>
          <p>{round.instructor}</p>
          <p className="meta">
            {round.school_department} · {round.bidding_window} · {round.term}
          </p>
          <p className="meta">{round.schedule}</p>
          <p className="meta">
            Vacancy: <span className="num">{round.vacancy}</span> (opening:{" "}
            <span className="num">{round.opening_vacancy}</span>)
          </p>

          <div className="history">
            <div className="history-header">
              <h4>Past bids for {round.course_code} (before {round.term})</h4>
              {(activeFilterCount > 0 || sortConfig.key) && (
                <button type="button" className="link-button" onClick={resetFilters}>
                  Reset filters
                </button>
              )}
            </div>
            {history && history.length > 1 && (
              <BidHistoryChart key={round.course_id} rows={filteredRows} target={target} />
            )}
            {history === null && <p className="meta">Loading history...</p>}
            {history && history.length === 0 && (
              <p className="meta">No prior bidding data for this course.</p>
            )}
            {history && history.length > 0 && (
              <table className="history-table">
                <thead>
                  <tr>
                    {FILTER_COLUMNS.map(({ key, label }) => (
                      <th key={key}>{label}</th>
                    ))}
                    {SORT_COLUMNS.map(({ key, label }) => (
                      <th key={key}>
                        <button
                          type="button"
                          className={`sort-button ${sortConfig.key === key ? "active" : ""}`}
                          onClick={() => toggleSort(key)}
                        >
                          {label}
                          {sortConfig.key === key ? (sortConfig.direction === "asc" ? " ▲" : " ▼") : ""}
                        </button>
                      </th>
                    ))}
                  </tr>
                  <tr className="filter-row">
                    {FILTER_COLUMNS.map(({ key, label }) => (
                      <th key={key}>
                        <MultiSelectFilter
                          label={label}
                          options={columnOptions[key]}
                          selected={columnFilters[key] ?? []}
                          onChange={(values) => setColumnFilter(key, values)}
                        />
                      </th>
                    ))}
                    {SORT_COLUMNS.map(({ key }) => (
                      <th key={key} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.length === 0 && (
                    <tr>
                      <td colSpan={HISTORY_COLUMNS.length} className="meta">
                        No rows match these filters.
                      </td>
                    </tr>
                  )}
                  {sortedRows.map((r, i) => (
                    <tr key={i}>
                      {HISTORY_COLUMNS.map(({ key }) => (
                        <td key={key} className={NUMERIC_COLUMNS.has(key) ? "num-col" : ""}>
                          {r[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!result ? (
            <form onSubmit={handleSubmit} className="guess-form">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Your guess (credits)"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary" disabled={loading}>
                Submit guess
              </button>
            </form>
          ) : (
            <div className="reveal">
              <p>
                Your guess: <strong>{result.predicted_value.toFixed(2)}</strong>
              </p>
              <p>
                Actual: <strong>{result.actual_value.toFixed(2)}</strong>
              </p>
              <p>
                Error: <strong>{(result.error_pct * 100).toFixed(1)}%</strong>
              </p>
              <p className={`score ${result.score >= 0.7 ? "" : "low"}`}>
                {result.score.toFixed(2)} / 1.0
              </p>
              {result.counted === false && (
                <p className="badge-muted">
                  Replay — practice only, doesn't count toward the leaderboard
                </p>
              )}
              <button className="btn-ghost" onClick={() => loadRound()}>
                Next section
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
