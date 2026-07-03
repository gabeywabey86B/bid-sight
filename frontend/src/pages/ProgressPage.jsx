import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const WINDOW = 5;

function withRollingAverage(scored) {
  return scored.map((p, i) => {
    const windowSlice = scored.slice(Math.max(0, i - WINDOW + 1), i + 1);
    const rolling = windowSlice.reduce((sum, r) => sum + r.score, 0) / windowSlice.length;
    return { ...p, rolling };
  });
}

function Sparkline({ points }) {
  if (points.length < 2) return null;
  const w = 600;
  const h = 160;
  const pad = 8;
  const xStep = (w - pad * 2) / (points.length - 1);
  const toY = (score) => h - pad - (score / 100) * (h - pad * 2);
  const trending = points.at(-1).rolling >= points[0].rolling;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${pad + i * xStep} ${toY(p.rolling)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="sparkline" preserveAspectRatio="none">
      <line x1={pad} y1={toY(50)} x2={w - pad} y2={toY(50)} className="sparkline-mid" />
      <path d={path} className={`sparkline-path ${trending ? "" : "down"}`} fill="none" />
    </svg>
  );
}

export default function ProgressPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [targetFilter, setTargetFilter] = useState("all");

  useEffect(() => {
    api
      .myPredictions()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const chronological = useMemo(() => {
    if (!data) return [];
    const scored = data.predictions.filter(
      (p) => p.score !== null && (targetFilter === "all" || p.target === targetFilter)
    );
    scored.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return withRollingAverage(scored);
  }, [data, targetFilter]);

  const avgScore = useMemo(() => {
    if (chronological.length === 0) return null;
    const sum = chronological.reduce((s, p) => s + p.score, 0);
    return (sum / chronological.length).toFixed(2);
  }, [chronological]);

  const latestRolling = chronological.at(-1)?.rolling;
  const firstRolling = chronological[0]?.rolling;
  const trend =
    latestRolling !== undefined && firstRolling !== undefined
      ? latestRolling - firstRolling
      : null;

  return (
    <div className="progress-page">
      <h2>Your Progress</h2>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p>Loading...</p>}

      {data && (
        <div className="target-toggle">
          <button
            className={targetFilter === "all" ? "active" : ""}
            onClick={() => setTargetFilter("all")}
          >
            All
          </button>
          <button
            className={targetFilter === "median" ? "active" : ""}
            onClick={() => setTargetFilter("median")}
          >
            Median
          </button>
          <button
            className={targetFilter === "min" ? "active" : ""}
            onClick={() => setTargetFilter("min")}
          >
            Minimum
          </button>
        </div>
      )}

      {data && chronological.length === 0 && (
        <p className="meta">No scored predictions yet for this filter — go train.</p>
      )}

      {data && chronological.length > 0 && (
        <>
          <div className="progress-summary">
            <div>
              <span className="big-stat">{avgScore}</span>
              <span className="meta">
                {targetFilter === "all" ? "all-time" : targetFilter} avg score
              </span>
            </div>
            <div>
              <span className="big-stat">{latestRolling.toFixed(1)}</span>
              <span className="meta">rolling avg (last {WINDOW})</span>
            </div>
            {trend !== null && (
              <div>
                <span className={`big-stat ${trend >= 0 ? "trend-up" : "trend-down"}`}>
                  {trend >= 0 ? "+" : ""}
                  {trend.toFixed(1)}
                </span>
                <span className="meta">change since your first {WINDOW}</span>
              </div>
            )}
          </div>

          <Sparkline points={chronological} />

          <table className="history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Course</th>
                <th>Target</th>
                <th>Score</th>
                <th>Rolling avg</th>
              </tr>
            </thead>
            <tbody>
              {chronological
                .slice()
                .reverse()
                .map((p, i) => (
                  <tr key={p.id}>
                    <td className="num-col">{chronological.length - i}</td>
                    <td>{p.course_id}</td>
                    <td>{p.target}</td>
                    <td className="num-col">{p.score.toFixed(1)}</td>
                    <td className="num-col">{p.rolling.toFixed(1)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
