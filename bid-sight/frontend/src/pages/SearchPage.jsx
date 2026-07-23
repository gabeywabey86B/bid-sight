import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { parseSchedule } from "../lib/schedule";
import MultiSelectFilter from "../components/MultiSelectFilter";

// Columns with a multi-select filter in the header.
const FILTER_COLUMNS = [
  { key: "course_code", label: "Code" },
  { key: "description", label: "Course" },
  { key: "term", label: "Term" },
  { key: "section", label: "Section" },
  { key: "bidding_window", label: "Window" },
  { key: "day", label: "Day" },
  { key: "timing", label: "Timing" },
  { key: "instructor", label: "Instructor" },
  { key: "school_department", label: "School" },
  { key: "vacancy", label: "Vacancy" },
  { key: "opening_vacancy", label: "Opening" },
];

// Columns with asc/desc sort instead of a filter.
const SORT_COLUMNS = [
  { key: "median_bid", label: "Median" },
  { key: "min_bid", label: "Min" },
];

const RESULT_COLUMNS = [...FILTER_COLUMNS, ...SORT_COLUMNS];

const NUMERIC_COLUMNS = new Set(["vacancy", "opening_vacancy", "median_bid", "min_bid"]);

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const rows = useMemo(() => {
    if (!results) return [];
    return results.map((r) => {
      const { day, timing } = parseSchedule(r.schedule);
      return {
        ...r,
        day,
        timing,
        median_bid: r.median_bid?.toFixed(2) ?? "",
        min_bid: r.min_bid?.toFixed(2) ?? "",
      };
    });
  }, [results]);

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

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError("Enter at least 2 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    setColumnFilters({});
    setSortConfig({ key: null, direction: "asc" });
    try {
      const data = await api.searchCourses(q);
      setResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="search-page">
      <h2>Course Search</h2>
      <p className="tagline">
        Look up every past bidding round for a course code, across all terms and sections.
      </p>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Course code, e.g. IS111"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoCapitalize="characters"
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {results && results.length === 0 && (
        <p className="meta">No bidding history found for "{query.trim()}".</p>
      )}

      {results && results.length > 0 && (
        <div className="history">
          <div className="history-header">
            <h4>
              {results.length} result{results.length === 1 ? "" : "s"} for "{query.trim()}"
            </h4>
            {(activeFilterCount > 0 || sortConfig.key) && (
              <button type="button" className="link-button" onClick={resetFilters}>
                Reset filters
              </button>
            )}
          </div>
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
                {FILTER_COLUMNS.map(({ key }) => (
                  <th key={key}>
                    <MultiSelectFilter
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
                  <td colSpan={RESULT_COLUMNS.length} className="meta">
                    No rows match these filters.
                  </td>
                </tr>
              )}
              {sortedRows.map((r, i) => (
                <tr key={i}>
                  {RESULT_COLUMNS.map(({ key }) => (
                    <td key={key} className={NUMERIC_COLUMNS.has(key) ? "num-col" : ""}>
                      {r[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
