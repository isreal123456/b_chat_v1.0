import { api } from "../../lib/api";
import { useState } from "react";
import { BellRing, Check, UserRound, X } from "lucide-react";

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
      setError(requestError.message || "Could not update friend request.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="feed-activity-card" aria-labelledby="feed-activity-title">
      <header className="feed-activity-heading">
        <div className="feed-activity-title-group">
          <span className="feed-panel-icon feed-panel-icon-purple"><BellRing size={17} aria-hidden="true" /></span>
          <div>
            <h3 id="feed-activity-title">Recent activity</h3>
            <p>Friend requests that need your attention</p>
          </div>
        </div>
        <span className="feed-activity-count" aria-label={`${activity.length} pending requests`}>{activity.length}</span>
      </header>
      {loadError && <p role="alert" className="feed-activity-error">{loadError}</p>}
      {error && <p role="alert" className="feed-activity-error">{error}</p>}
      {loading ? (
        <p role="status" className="feed-activity-loading">Loading activity…</p>
      ) : loadError ? null : activity.length === 0 ? (
        <div className="feed-activity-empty">
          <span><Check size={17} aria-hidden="true" /></span>
          <div><strong>All caught up</strong><p>New friend requests will appear here.</p></div>
        </div>
      ) : (
        <div className="feed-activity-list">
          {activity.map((item) => (
            <div key={item.id} className="feed-activity-item">
              <div className="feed-activity-avatar" aria-hidden="true">
                {item.name?.trim()?.charAt(0)?.toUpperCase() || <UserRound size={16} />}
              </div>
              <div className="feed-activity-details">
                <p><strong>{item.name || "Someone"}</strong> {item.action}</p>
                <div className="feed-activity-actions">
                  <button
                    type="button"
                    disabled={workingId === item.id}
                    onClick={() => handleRequest(item.id, "reject")}
                    className="feed-activity-decline"
                  >
                    <X size={14} aria-hidden="true" /> Decline
                  </button>
                  <button
                    type="button"
                    disabled={workingId === item.id}
                    onClick={() => handleRequest(item.id, "accept")}
                    className="feed-activity-accept"
                  >
                    <Check size={14} aria-hidden="true" /> {workingId === item.id ? "Saving…" : "Accept"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
