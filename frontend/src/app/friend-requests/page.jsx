import { useEffect, useState } from "react";
import { Check, Clock3, UserRound, X } from "lucide-react";
import { Link } from "react-router-dom";

import AppShell from "../../components/layout/AppShell";
import Avatar from "../../components/ui/Avatar";
import { api } from "../../lib/api";

function RequestRow({ request, type, onAccept, onReject, onCancel, disabled }) {
  const person = request.user;
  return (
    <div className="list-row">
      <Link to={`/profile/${person.username}`} aria-label={`${person.name}'s profile`}>
        <Avatar name={person.name || person.username} size={44} />
      </Link>
      <div className="list-row__body">
        <p className="list-row__title">{person.name || person.username}</p>
        <p className="list-row__meta">@{person.username}</p>
      </div>
      <div className="list-row__actions">
        {type === "received" ? (
          <>
            <button type="button" className="btn btn-primary btn-sm" disabled={disabled} onClick={() => onAccept(request.id)}>
              <Check size={14} aria-hidden="true" /> Accept
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => onReject(request.id)}>
              <X size={14} aria-hidden="true" /> Decline
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => onCancel(request.id)}>
            <X size={14} aria-hidden="true" /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default function FriendRequestsPage() {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([api("/friends/requests/received"), api("/friends/requests/sent")])
      .then(([receivedRequests, sentRequests]) => {
        if (!active) return;
        setReceived(receivedRequests);
        setSent(sentRequests);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load connection requests.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateReceived = async (requestId, action) => {
    setError("");
    setWorkingId(requestId);
    try {
      await api(`/friends/requests/${requestId}/${action}`, { method: "PATCH" });
      setReceived((current) => current.filter((request) => request.id !== requestId));
    } catch (requestError) {
      setError(requestError.message || "Could not update the request.");
    } finally {
      setWorkingId(null);
    }
  };

  const cancelRequest = async (requestId) => {
    setError("");
    setWorkingId(requestId);
    try {
      await api(`/friends/requests/${requestId}`, { method: "DELETE" });
      setSent((current) => current.filter((request) => request.id !== requestId));
    } catch (requestError) {
      setError(requestError.message || "Could not cancel the request.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <AppShell title="Connections" subtitle="Your network">
      <div className="page-enter">
        <header className="page-head">
          <div>
            <p className="eyebrow">Network</p>
            <h1 className="page-head__title">Connection requests</h1>
            <p className="page-head__sub">Accept the people you want in your corner, or withdraw requests you sent.</p>
          </div>
          <span className="badge badge--neutral">{received.length + sent.length} pending</span>
        </header>

        {error && <div className="alert alert--error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}

        <div className="section-label">
          <span><UserRound size={13} aria-hidden="true" /> Received</span>
          <span>{received.length}</span>
        </div>
        <section className="card list-card">
          {loading ? (
            <div className="list-row"><span className="skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} /><span className="skeleton" style={{ flex: 1, height: 12 }} /></div>
          ) : received.length === 0 ? (
            <div className="list-row">
              <div className="list-row__body">
                <p className="list-row__title">No requests waiting.</p>
                <p className="list-row__meta">When someone asks to connect, it will show up here.</p>
              </div>
            </div>
          ) : (
            received.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                type="received"
                onAccept={(id) => updateReceived(id, "accept")}
                onReject={(id) => updateReceived(id, "reject")}
                disabled={workingId === request.id}
              />
            ))
          )}
        </section>

        <div className="section-label">
          <span><Clock3 size={13} aria-hidden="true" /> Sent</span>
          <span>{sent.length}</span>
        </div>
        <section className="card list-card">
          {loading ? (
            <div className="list-row"><span className="skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} /><span className="skeleton" style={{ flex: 1, height: 12 }} /></div>
          ) : sent.length === 0 ? (
            <div className="list-row">
              <div className="list-row__body">
                <p className="list-row__title">No outgoing requests.</p>
                <p className="list-row__meta">Find builders in Explore and send your first request.</p>
              </div>
            </div>
          ) : (
            sent.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                type="sent"
                onCancel={cancelRequest}
                disabled={workingId === request.id}
              />
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}
