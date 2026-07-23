import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p className="meta">{new Date(point.created_at).toLocaleDateString()}</p>
      <p>Score: {point.score.toFixed(2)}</p>
      <p>Rolling avg: {point.rolling.toFixed(2)}</p>
    </div>
  );
}

// X axis is attempt number, not date — many attempts happen in one sitting, so
// dates would collapse into unreadable clusters. The date lives in the tooltip.
export default function ScoreChart({ points }) {
  if (points.length < 2) return null;

  const trendingUp = points.at(-1).rolling >= points[0].rolling;
  const data = points.map((p, i) => ({ ...p, attempt: i + 1 }));

  return (
    <div className="chart-block">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
          <XAxis dataKey="attempt" tick={{ fontSize: 12 }} stroke="var(--muted)" />
          <YAxis
            domain={[0, 1]}
            tick={{ fontSize: 12 }}
            stroke="var(--muted)"
            label={{ value: "score", angle: -90, position: "insideLeft", fontSize: 12 }}
          />
          <ReferenceLine y={0.5} stroke="var(--border)" strokeDasharray="4 4" />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="score"
            name="Score"
            stroke="var(--muted)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="rolling"
            name="Rolling avg"
            stroke={trendingUp ? "var(--accent)" : "var(--muted)"}
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
