import { useState } from "react";
import { api } from "../lib/api";
import { useApi } from "../lib/useApi";

function ResultsCard({ closed }) {
  const r = closed.results;
  return (
    <div className="round-card">
      <h3>
        {closed.course_code} {closed.section} — {closed.round_label}
      </h3>
      <p className="meta">Round closed</p>

      {closed.my_bid !== null && (
        <p className={`badge-muted ${closed.i_won ? "winner-badge won" : "winner-badge missed"}`}>
          {closed.i_won ? "You won a seat" : "You didn't win a seat"}
        </p>
      )}

      <div className="progress-summary">
        <div>
          <span className="big-stat">{r.clearing_price?.toFixed(2) ?? "—"}</span>
          <span className="meta">clearing price</span>
        </div>
        <div>
          <span className="big-stat">
            {r.seats_filled}/{r.seats_allocated}
          </span>
          <span className="meta">seats filled</span>
        </div>
        <div>
          <span className="big-stat">{r.avg_bid?.toFixed(2) ?? "—"}</span>
          <span className="meta">avg bid</span>
        </div>
        <div>
          <span className="big-stat">{r.min_bid?.toFixed(2) ?? "—"}</span>
          <span className="meta">min bid</span>
        </div>
        <div>
          <span className="big-stat">{r.max_bid?.toFixed(2) ?? "—"}</span>
          <span className="meta">max bid</span>
        </div>
        <div>
          <span className="big-stat">{r.median_bid?.toFixed(2) ?? "—"}</span>
          <span className="meta">median bid</span>
        </div>
      </div>
    </div>
  );
}

export default function LivePage() {
  const { data, error, refetch } = useApi(api.getLiveCurrent, { intervalMs: 5000 });
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!data?.round) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await api.submitLiveBid(data.round.id, Number(amount));
      setAmount("");
      refetch();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="live-page">
      <h2>Live Round</h2>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p>Loading...</p>}

      {data && !data.round && !data.last_closed && (
        <p className="meta">No live round right now — check back later.</p>
      )}

      {data?.round && (
        <div className="round-card">
          <h3>
            {data.round.course_code} {data.round.section} — {data.round.round_label}
          </h3>
          <p className="meta">{data.round.description}</p>
          <p className="meta">
            Seats: <span className="num">{data.round.seats_allocated}</span>
          </p>
          {data.round.ends_at && (
            <p className="meta">Closes at {new Date(data.round.ends_at).toLocaleString()}</p>
          )}

          {data.locked_out ? (
            <p className="error">
              You already won a seat for this course/section — bidding is locked.
            </p>
          ) : data.my_bid !== null ? (
            <p className="badge-muted">Bid submitted: e${data.my_bid.toFixed(2)} — waiting for close</p>
          ) : (
            <form onSubmit={handleSubmit} className="guess-form">
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Your bid (credits)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "..." : "Submit bid"}
              </button>
            </form>
          )}
          {submitError && <p className="error">{submitError}</p>}
        </div>
      )}

      {!data?.round && data?.last_closed && <ResultsCard closed={data.last_closed} />}
    </div>
  );
}
