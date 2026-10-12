import { useEffect, useState } from "react";
import { Check, Clock3, UserRound, X } from "lucide-react";
import { Link } from "react-router-dom";
import TopNav from "../../components/ui/navbar";
import { api } from "../../lib/api";

function RequestRow({ request, type, onAccept, onReject, onCancel, disabled }) {
  const user = request.user;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-700 py-4 last:border-b-0">
      <Link to={`/profile/${user.username}`} className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-lg font-semibold text-neutral-900">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{user.name}</p>
          <p className="truncate text-sm text-neutral-500">@{user.username}</p>
        </div>
      </Link>

      {type === "received" ? (
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAccept(request.id)}
            className="flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-yellow-300"
          >
            <Check size={15} />
            Accept
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onReject(request.id)}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-700 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-600"
          >
            <X size={15} />
            Decline
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onCancel(request.id)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-700 px-3 py-2 text-sm text-neutral-200 transition hover:bg-neutral-600"
        >
          <X size={15} />
          Cancel
        </button>
      )}
    </div>
  );
}

function EmptyState({ children }) {
  return <p className="py-8 text-center text-sm text-neutral-500">{children}</p>;
}

export default function FriendRequestsPage() {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);

  useEffect(() => {
    Promise.all([
      api("/friends/requests/received"),
      api("/friends/requests/sent"),
    ])
      .then(([receivedRequests, sentRequests]) => {
        setReceived(receivedRequests);
        setSent(sentRequests);
      })
      .catch((requestError) => setError(requestError.message || "Could not load friend requests."))
      .finally(() => setLoading(false));
  }, []);

  const updateReceived = async (requestId, action) => {
    setError(""); setWorkingId(requestId);
    try {
      await api(`/friends/requests/${requestId}/${action}`, { method: "PATCH" });
      setReceived((current) => current.filter((request) => request.id !== requestId));
    } catch (requestError) { setError(requestError.message || "Could not update request."); }
    finally { setWorkingId(null); }
  };

  const cancelRequest = async (requestId) => {
    setError(""); setWorkingId(requestId);
    try {
      await api(`/friends/requests/${requestId}`, { method: "DELETE" });
      setSent((current) => current.filter((request) => request.id !== requestId));
    } catch (requestError) { setError(requestError.message || "Could not cancel request."); }
    finally { setWorkingId(null); }
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      <TopNav />
      <main className="mx-auto max-w-3xl space-y-6 px-6 pb-10">
        <div>
          <h1 className="text-2xl font-semibold text-white">Friend requests</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage people who want to connect with you.</p>
        </div>

        {error && <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">{error}</p>}
        {loading && <p role="status" className="text-sm text-neutral-500">Loading requests…</p>}

        <section className="rounded-2xl border border-neutral-700 bg-neutral-800 px-5">
          <div className="flex items-center gap-2 border-b border-neutral-700 py-4">
            <UserRound size={18} className="text-yellow-400" />
            <h2 className="font-semibold text-white">Received</h2>
            <span className="text-sm text-neutral-500">{received.length}</span>
          </div>
          {loading ? null : received.length === 0 ? (
            <EmptyState>No pending friend requests.</EmptyState>
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

        <section className="rounded-2xl border border-neutral-700 bg-neutral-800 px-5">
          <div className="flex items-center gap-2 border-b border-neutral-700 py-4">
            <Clock3 size={18} className="text-yellow-400" />
            <h2 className="font-semibold text-white">Sent</h2>
            <span className="text-sm text-neutral-500">{sent.length}</span>
          </div>
          {loading ? null : sent.length === 0 ? (
            <EmptyState>No pending sent requests.</EmptyState>
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
      </main>
    </div>
  );
}
