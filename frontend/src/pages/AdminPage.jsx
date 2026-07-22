import { useState } from "react";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";

function RoundRow({ round, onOpen, onClose, onSelect, selected }) {
  return (
    <tr className={selected ? "own-row" : ""}>
      <td>{round.round_label}</td>
      <td>
        {round.course_code} {round.section}
      </td>
      <td className="num-col">{round.seats_allocated}</td>
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
        <button className="link-button" onClick={() => onSelect(round.id)} style={{ marginLeft: 12 }}>
          View bids
        </button>
      </td>
    </tr>
  );
}

function CreateRoundForm({ sessionId, onCreated }) {
  const [form, setForm] = useState({
    round_label: "",
    course_code: "",
    section: "",
    description: "",
    starts_at: "",
    ends_at: "",
    seats_allocated: "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function prefillSeats() {
    if (!form.course_code || !form.section) return;
    try {
      const { remaining } = await api.adminSeatsRemaining(form.course_code, form.section);
      update("seats_allocated", String(remaining));
    } catch {
      // ignore — admin can just type the number
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.adminCreateRound(sessionId, {
        round_label: form.round_label,
        course_code: form.course_code,
        section: form.section,
        description: form.description || null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        seats_allocated: Number(form.seats_allocated),
      });
      setForm({
        round_label: "",
        course_code: "",
        section: "",
        description: "",
        starts_at: "",
        ends_at: "",
        seats_allocated: "",
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <input
        placeholder="Round label (e.g. Round 1)"
        value={form.round_label}
        onChange={(e) => update("round_label", e.target.value)}
        required
      />
      <input
        placeholder="Course code"
        value={form.course_code}
        onChange={(e) => update("course_code", e.target.value)}
        onBlur={prefillSeats}
        required
      />
      <input
        placeholder="Section"
        value={form.section}
        onChange={(e) => update("section", e.target.value)}
        onBlur={prefillSeats}
        required
      />
      <input
        placeholder="Description"
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
      />
      <label className="meta">
        Starts at
        <input
          type="datetime-local"
          value={form.starts_at}
          onChange={(e) => update("starts_at", e.target.value)}
        />
      </label>
      <label className="meta">
        Ends at (blank = manual close only)
        <input
          type="datetime-local"
          value={form.ends_at}
          onChange={(e) => update("ends_at", e.target.value)}
        />
      </label>
      <input
        type="number"
        min="0"
        placeholder="Seats allocated"
        value={form.seats_allocated}
        onChange={(e) => update("seats_allocated", e.target.value)}
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "..." : "Create round"}
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

function SessionPanel({ session }) {
  const { data, refetch } = useApi(() => api.adminListRounds(session.id), { intervalMs: 5000 });
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [actionError, setActionError] = useState(null);

  async function handleOpen(roundId) {
    setActionError(null);
    try {
      await api.adminOpenRound(roundId);
      refetch();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleClose(roundId) {
    setActionError(null);
    try {
      await api.adminCloseRound(roundId);
      refetch();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <div className="round-card">
      <h3>{session.name}</h3>
      <CreateRoundForm sessionId={session.id} onCreated={refetch} />
      {actionError && <p className="error">{actionError}</p>}

      {data?.rounds.length > 0 && (
        <table className="history-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Course</th>
              <th>Seats</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.rounds.map((r) => (
              <RoundRow
                key={r.id}
                round={r}
                onOpen={handleOpen}
                onClose={handleClose}
                onSelect={setSelectedRoundId}
                selected={selectedRoundId === r.id}
              />
            ))}
          </tbody>
        </table>
      )}

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
        <SessionPanel key={s.id} session={s} />
      ))}
    </div>
  );
}
