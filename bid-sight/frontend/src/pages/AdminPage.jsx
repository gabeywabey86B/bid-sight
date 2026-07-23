import { useState } from "react";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";

function RoundRow({ round, onOpen, onClose, onDelete, onSelect, selected }) {
  // Later windows are placeholders until they open — their seat count only
  // becomes real once every earlier window has cleared.
  const seats =
    round.status === "draft" && round.round_index > 0 ? "—" : round.seats_allocated ?? "—";
  // Loose == catches undefined too: rounds created before the ladder existed
  // have no round_index, and `undefined + 1` renders as NaN.
  const position = round.round_index == null ? "—" : round.round_index + 1;
  return (
    <tr className={selected ? "own-row" : ""}>
      <td className="num-col">{position}</td>
      <td>{round.round_label}</td>
      <td className="num-col">{seats}</td>
      <td className="num-col">
        {round.status === "closed" ? `${round.seats_filled ?? 0}` : ""}
      </td>
      <td>
        <span className={`status-pill status-${round.status}`}>{round.status}</span>
      </td>
      <td>
        {round.status === "draft" && (
          <button className="link-button" onClick={() => onOpen(round.id)}>
            Open
          </button>
        )}
        {round.status === "open" && (
          <button className="link-button" onClick={() => onClose(round.id)}>
            Close
          </button>
        )}
        <button className="link-button" onClick={() => onSelect(round.id)}>
          View bids
        </button>
        {round.status === "draft" && (
          <button className="link-button" onClick={() => onDelete(round.id)}>
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}

// Pick a course code from the list, type the section, generate the 12-window
// ladder. Capacity is optional — the backend falls back to the section's
// opening_vacancy on record.
function CreateLadderForm({ sessionId, onCreated }) {
  const { data: codesData } = useApi(api.getCourseCodes);
  const [code, setCode] = useState("");
  const [section, setSection] = useState("");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code) {
      setError("Pick a course code.");
      return;
    }
    if (!section.trim()) {
      setError("Enter a section, e.g. G3.");
      return;
    }
    const cap = capacity.trim() === "" ? null : Number(capacity);
    if (cap !== null && (!Number.isInteger(cap) || cap <= 0)) {
      setError("Capacity must be a positive whole number, or blank.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.adminCreateLadder(sessionId, code, section.trim(), cap);
      setSection("");
      setCapacity("");
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <select value={code} onChange={(e) => setCode(e.target.value)}>
        <option value="">Course code...</option>
        {(codesData?.codes ?? []).map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        placeholder="Section (e.g. G3)"
        value={section}
        onChange={(e) => setSection(e.target.value)}
      />
      <input
        type="number"
        min="1"
        placeholder="Capacity (blank = use opening vacancy on record)"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "..." : "Generate 12-window ladder"}
      </button>
    </form>
  );
}

function BidsTable({ roundId }) {
  const { data } = useApi(() => api.adminRoundBids(roundId), { intervalMs: 5000 });
  if (!data) return <p className="meta">Loading bids...</p>;
  if (data.bids.length === 0) return <p className="meta">No bids yet.</p>;

  return (
    <table className="history-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Amount</th>
          <th>Winner</th>
          <th>Submitted</th>
        </tr>
      </thead>
      <tbody>
        {data.bids.map((b) => (
          <tr key={b.user_id}>
            <td>{b.display_name}</td>
            <td className="num-col">{b.amount.toFixed(2)}</td>
            <td>{b.is_winner ? "✓" : ""}</td>
            <td className="meta">{new Date(b.created_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// A ladder is every round sharing course_code + section — the same grouping
// the backend uses to carry seats forward.
function groupLadders(rounds) {
  const groups = new Map();
  for (const r of rounds) {
    const key = `${r.course_code}|${r.section}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return [...groups.values()];
}

function SessionPanel({ session, onDeleted }) {
  const { data, refetch } = useApi(() => api.adminListRounds(session.id), { intervalMs: 5000 });
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Every admin action is the same shape: call, refetch, surface the error.
  async function run(fn) {
    setActionError(null);
    try {
      await fn();
      refetch();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleDeleteSession() {
    if (!confirm(`Delete session "${session.name}" and everything in it?`)) return;
    setActionError(null);
    try {
      await api.adminDeleteSession(session.id);
      onDeleted();
    } catch (err) {
      // The backend refuses when real bids exist; ask once, then force.
      if (err.message.includes("force=true") && confirm(`${err.message}\n\nDelete anyway?`)) {
        await api.adminDeleteSession(session.id, true);
        onDeleted();
        return;
      }
      setActionError(err.message);
    }
  }

  const ladders = groupLadders(data?.rounds ?? []);

  return (
    <div className="round-card">
      <div className="history-header">
        <h3>{session.name}</h3>
        <button className="link-button" onClick={handleDeleteSession}>
          Delete session
        </button>
      </div>

      <CreateLadderForm sessionId={session.id} onCreated={refetch} />
      {actionError && <p className="error">{actionError}</p>}

      {ladders.map((ladder) => {
        const first = ladder[0];
        // Legacy rounds predate the ladder and have no round_index; fall back
        // to the largest seat count so the header never reads 0 or NaN.
        const capacity =
          ladder.find((r) => r.round_index === 0)?.seats_allocated ??
          Math.max(0, ...ladder.map((r) => r.seats_allocated ?? 0));
        const filled = ladder.reduce((n, r) => n + (r.seats_filled ?? 0), 0);
        const closed = ladder.filter((r) => r.status === "closed").length;
        const allDrafts = ladder.every((r) => r.status === "draft");
        return (
          <div key={`${first.course_code}|${first.section}`} className="history">
            <div className="history-header">
              <h4>
                {first.course_code} {first.section} — {capacity} seats
              </h4>
              {allDrafts && (
                <button
                  className="link-button"
                  onClick={() =>
                    confirm(`Delete the ${first.course_code} ${first.section} ladder?`) &&
                    run(() =>
                      api.adminDeleteLadder(session.id, first.course_code, first.section)
                    )
                  }
                >
                  Delete ladder
                </button>
              )}
            </div>
            <p className="meta">
              Seats filled {filled} / {capacity} · {closed} of {ladder.length} windows closed
            </p>
            <table className="history-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Round</th>
                  <th>Seats</th>
                  <th>Filled</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ladder.map((r) => (
                  <RoundRow
                    key={r.id}
                    round={r}
                    onOpen={(id) => run(() => api.adminOpenRound(id))}
                    onClose={(id) => run(() => api.adminCloseRound(id))}
                    onDelete={(id) =>
                      confirm(`Delete ${r.round_label}?`) &&
                      run(() => api.adminDeleteRound(id))
                    }
                    onSelect={setSelectedRoundId}
                    selected={selectedRoundId === r.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {selectedRoundId && (
        <div className="history">
          <div className="history-header">
            <h4>Bids</h4>
            <button className="link-button" onClick={() => setSelectedRoundId(null)}>
              Close
            </button>
          </div>
          <BidsTable roundId={selectedRoundId} />
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { data, refetch } = useApi(api.adminListSessions, { intervalMs: 5000 });
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateSession(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.adminCreateSession(name);
      setName("");
      refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-page">
      <h2>Live Round Admin</h2>

      <form onSubmit={handleCreateSession} className="guess-form">
        <input
          placeholder="New session name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "..." : "Create session"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {!data && <p className="meta">Loading sessions...</p>}
      {data?.sessions.length === 0 && <p className="meta">No sessions yet.</p>}
      {data?.sessions.map((s) => (
        <SessionPanel key={s.id} session={s} onDeleted={refetch} />
      ))}
    </div>
  );
}
