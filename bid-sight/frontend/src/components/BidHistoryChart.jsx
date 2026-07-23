import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import MultiSelectFilter from "./MultiSelectFilter";

const round2 = (n) => Math.round(n * 100) / 100;

// Averages median/min bids per term across rows sharing that term. Sections
// and bidding windows are dedicated chart-local filters (combinable) rather
// than only inheriting the table's filters, since averaging across different
// windows/sections within a term otherwise blurs the trend into a single
// number that doesn't represent any one section's real trajectory.
export default function BidHistoryChart({ rows, target }) {
  const [view, setView] = useState(target === "min" ? "min" : "median");
  const [sectionFilter, setSectionFilter] = useState([]);
  const [windowFilter, setWindowFilter] = useState([]);

  const sectionOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => String(r.section ?? "")).filter(Boolean))).sort(),
    [rows]
  );
  const windowOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => String(r.bidding_window ?? "")).filter(Boolean))).sort(),
    [rows]
  );

  // Baseline distinct-term count ignores this chart's own filters — it's what
  // decides whether there's any point showing the chart section at all. Once
  // that's true, the controls always stay visible; only the plot area itself
  // swaps to an empty-state so narrowing a filter never hides the way back out.
  const baselineTermCount = useMemo(
    () => new Set(rows.map((r) => r.term)).size,
    [rows]
  );

  const data = useMemo(() => {
    const filtered = rows.filter(
      (r) =>
        (sectionFilter.length === 0 || sectionFilter.includes(String(r.section ?? ""))) &&
        (windowFilter.length === 0 || windowFilter.includes(String(r.bidding_window ?? "")))
    );
    const byTerm = new Map();
    for (const r of filtered) {
      const median = parseFloat(r.median_bid);
      const min = parseFloat(r.min_bid);
      if (!byTerm.has(r.term)) byTerm.set(r.term, { term: r.term, median: [], min: [] });
      const bucket = byTerm.get(r.term);
      if (!Number.isNaN(median)) bucket.median.push(median);
      if (!Number.isNaN(min)) bucket.min.push(min);
    }
    return Array.from(byTerm.values())
      .sort((a, b) => (a.term < b.term ? -1 : a.term > b.term ? 1 : 0))
      .map(({ term, median, min }) => ({
        term,
        avgMedian: median.length ? round2(median.reduce((s, v) => s + v, 0) / median.length) : null,
        avgMin: min.length ? round2(min.reduce((s, v) => s + v, 0) / min.length) : null,
      }));
  }, [rows, sectionFilter, windowFilter]);

  if (baselineTermCount < 2) return null;

  return (
    <div className="chart-block">
      <div className="chart-controls">
        <div className="target-toggle">
          <button className={view === "median" ? "active" : ""} onClick={() => setView("median")}>
            Median
          </button>
          <button className={view === "min" ? "active" : ""} onClick={() => setView("min")}>
            Min
          </button>
          <button className={view === "both" ? "active" : ""} onClick={() => setView("both")}>
            Both
          </button>
        </div>
        <div className="chart-filter">
          <label>Section</label>
          <MultiSelectFilter
            options={sectionOptions}
            selected={sectionFilter}
            onChange={setSectionFilter}
          />
        </div>
        <div className="chart-filter">
          <label>Window</label>
          <MultiSelectFilter
            options={windowOptions}
            selected={windowFilter}
            onChange={setWindowFilter}
          />
        </div>
      </div>
      {data.length < 2 ? (
        <p className="meta chart-empty">
          Not enough data for this section/window combination — try a different filter.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" />
            <XAxis dataKey="term" tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="var(--text-muted)"
              label={{ value: "bid (e$)", angle: -90, position: "insideLeft", fontSize: 12 }}
            />
            <Tooltip />
            <Legend />
            {(view === "median" || view === "both") && (
              <Line
                type="monotone"
                dataKey="avgMedian"
                name="Median"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls
              />
            )}
            {(view === "min" || view === "both") && (
              <Line
                type="monotone"
                dataKey="avgMin"
                name="Min"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
