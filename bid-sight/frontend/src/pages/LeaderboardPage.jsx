import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useApi } from "../lib/useApi";

function AllTimeTable({ rows, userId, empty }) {
  if (!rows) return <p>Loading...</p>;
  if (rows.length === 0) return <p>{empty}</p>;
  return (
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
          <tr key={r.user_id} className={r.user_id === userId ? "own-row" : ""}>
            <td className="num-col">{i + 1}</td>
            <td>{r.display_name}</td>
            <td className="num-col">{r.avg_score}</td>
            <td className="num-col">{r.avg_error_pct}%</td>
            <td className="num-col">{r.predictions}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TopScoresTable({ rows }) {
  if (!rows) return <p>Loading...</p>;
  if (rows.length === 0) return <p>No scores yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Course</th>
          <th>Score</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.display_name}-${r.course_code}-${r.created_at}`}>
            <td className="num-col">{i + 1}</td>
            <td>{r.display_name}</td>
            <td>{r.course_code}</td>
            <td className="num-col">{r.score}</td>
            <td className="num-col">{r.error_pct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LeaderboardBoards({ school, userId }) {
  const { data, error } = useApi(() => api.leaderboard(20, school), { intervalMs: 15000 });

  return (
    <>
      {error && <p className="error">{error}</p>}

      <h3>All-time</h3>
      <AllTimeTable rows={data?.all_time} userId={userId} empty="No scores yet — be the first." />

      <h3>This week</h3>
      <AllTimeTable rows={data?.weekly} userId={userId} empty="No scores yet this week." />

      <h3>Best predictions</h3>
      <TopScoresTable rows={data?.top_scores} />
    </>
  );
}

function FriendsBoards({ userId }) {
  const { data, error } = useApi(api.friendsLeaderboard, { intervalMs: 15000 });

  const empty =
    data && data.all_time.length === 0 && data.weekly.length === 0 ? (
      <p className="meta">
        No friends yet — <Link to="/profile">add friends to build this board</Link>.
      </p>
    ) : null;

  return (
    <>
      {error && <p className="error">{error}</p>}
      {empty ?? (
        <>
          <h3>All-time</h3>
          <AllTimeTable
            rows={data?.all_time}
            userId={userId}
            empty="No scores yet among your friends."
          />

          <h3>This week</h3>
          <AllTimeTable
            rows={data?.weekly}
            userId={userId}
            empty="No scores yet this week among your friends."
          />
        </>
      )}
    </>
  );
}

export default function LeaderboardPage() {
  const { session } = useAuth();
  const { data: schoolsData } = useApi(api.getSchools);
  const [school, setSchool] = useState(null);
  const [view, setView] = useState("global"); // "global" | "friends"
  const userId = session?.user?.id;

  return (
    <div className="leaderboard-page">
      <h2>Training Leaderboard</h2>
      <p className="meta">
        Only your first attempt on each course counts. Board updates automatically.
        School boards need 5 counted predictions all-time (2 this week) to rank.
      </p>

      <div className="target-toggle">
        <button className={view === "global" ? "active" : ""} onClick={() => setView("global")}>
          Global
        </button>
        <button className={view === "friends" ? "active" : ""} onClick={() => setView("friends")}>
          Friends
        </button>
      </div>

      {view === "global" ? (
        <>
          <div className="target-toggle school-tabs">
            <button className={school === null ? "active" : ""} onClick={() => setSchool(null)}>
              All
            </button>
            {(schoolsData?.schools ?? []).map((s) => (
              <button key={s} className={school === s ? "active" : ""} onClick={() => setSchool(s)}>
                {s}
              </button>
            ))}
          </div>

          {/* key remount: useApi only fetches on mount/interval, so switching tabs
              must remount the boards to fetch the new school immediately. */}
          <LeaderboardBoards key={school ?? "all"} school={school} userId={userId} />
        </>
      ) : (
        <FriendsBoards userId={userId} />
      )}
    </div>
  );
}
