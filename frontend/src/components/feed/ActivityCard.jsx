import { useState } from "react";
import { BellRing, Check, UserRound, X } from "lucide-react";

import Avatar from "../ui/Avatar";
import { api } from "../../lib/api";

export default function ActivityCard({ activity, loading, loadError, onRequestHandled }) {
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState(null);

  const handleRequest = async (requestId, action) => {
    setError("");
    setWorkingId(requestId);
    try {
      await api(`/friends/requests/${requestId}/${action}`, { method: "PATCH" });
      onRequestHandled(requestId);
    } catch (requestError) {
      setError(requestError.message || "Could not update the request.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="card activity-card" aria-labelledby="activity-title">
      <div className="card__head">
        <div className="row" style={{ gap: "0.5rem" }}>
          <span className="notif-icon notif-icon--friend">
            <BellRing size={16} aria-hidden="true" />
          </span>
          <div>
            <h2 id="activity-title" className="card__title">Requests</h2>
            <p className="muted" style={{ fontSize: "0.7rem" }}>People who want to connect</p>
          </div>
        </div>
        <span className="badge badge--accent">{activity.length}</span>
      </div>

      {loadError && <p role="alert" className="muted" style={{ fontSize: "0.78rem" }}>{loadError}</p>}
      {error && <p role="alert" className="muted" style={{ fontSize: "0.78rem" }}>{error}</p>}

      {loading ? (
        <p role="status" className="muted" style={{ fontSize: "0.78rem" }}>Loading requests…</p>
      ) : loadError ? null : activity.length === 0 ? (
        <div className="empty-state" style={{ padding: "1.2rem 1rem" }}>
          <Check size={18} aria-hidden="true" />
          <p>No pending requests. Go find your people in Explore.</p>
        </div>
      ) : (
        <div className="activity-list" style={{ marginTop: "0.8rem" }}>
          {activity.map((item) => (
            <div key={item.id} className="activity-item">
              <Avatar name={item.name || "Someone"} size={30} />
              <div className="activity-item__body">
                <p>
                  <strong>{item.name || "Someone"}</strong> sent you a connection request.
                </p>
                <div className="activity-item__actions">
                  <button
                    type="button"
                    disabled={workingId === item.id}
                    onClick={() => handleRequest(item.id, "accept")}
                    className="btn btn-primary btn-sm"
                  >
                    <Check size={13} aria-hidden="true" />
                    {workingId === item.id ? "Saving…" : "Accept"}
                  </button>
                  <button
                    type="button"
                    disabled={workingId === item.id}
                    onClick={() => handleRequest(item.id, "reject")}
                    className="btn btn-secondary btn-sm"
                  >
                    <X size={13} aria-hidden="true" />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !loadError && activity.length === 0 && (
        <p className="muted" style={{ marginTop: "0.6rem", fontSize: "0.7rem" }}>
          <UserRound size={12} aria-hidden="true" style={{ verticalAlign: "-1px", marginRight: 4 }} />
          Connection requests appear here.
        </p>
      )}
    </section>
  );
}
