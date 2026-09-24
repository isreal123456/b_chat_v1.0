import { api } from "../../lib/api";

export default function ActivityCard({ activity, onRequestHandled }) {
  const handleRequest = async (requestId, action) => {
    await api(`/friends/requests/${requestId}/${action}`, { method: "PATCH" });
    onRequestHandled(requestId);
  };

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5">
      <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
      {activity.length === 0 ? (
        <p className="text-sm text-neutral-500">No recent activity.</p>
      ) : (
        <div className="space-y-4">
          {activity.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center text-sm font-semibold text-neutral-900 shrink-0">
                {a.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{a.name}</p>
                <p className="text-neutral-500 text-xs mb-2">{a.action}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleRequest(a.id, "reject")}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequest(a.id, "accept")}
                    className="text-xs bg-yellow-400 text-neutral-900 font-medium rounded-md px-3 py-1"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
