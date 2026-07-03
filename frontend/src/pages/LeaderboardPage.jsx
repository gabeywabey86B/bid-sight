import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function LeaderboardPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .leaderboard(20)
      .then((data) => setRows(data.leaderboard))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="leaderboard-page">
      <h2>Training Leaderboard</h2>
      {error && <p className="error">{error}</p>}
      {!rows && !error && <p>Loading...</p>}
      {rows && rows.length === 0 && <p>No scores yet — be the first.</p>}
      {rows && rows.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Avg score</th>
              <th>Avg error</th>
              <th>Predictions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.user_id}>
                <td className="num-col">{i + 1}</td>
                <td>{r.display_name}</td>
                <td className="num-col">{r.avg_score}</td>
                <td className="num-col">{r.avg_error_pct}%</td>
                <td className="num-col">{r.predictions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
