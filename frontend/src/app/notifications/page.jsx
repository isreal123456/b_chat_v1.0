import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import TopNav from "../../components/ui/navbar";
import { api } from "../../lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState(null);

  useEffect(() => {
    let active = true;
    api("/notifications")
      .then((data) => { if (active) setNotifications(data); })
      .catch((requestError) => { if (active) setError(requestError.message || "Could not load notifications."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const markRead = async (notification) => {
    setWorkingId(notification.id);
    setError("");
    try {
      const updated = await api(`/notifications/${notification.id}/read`, { method: "PATCH" });
      setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (requestError) { setError(requestError.message || "Could not update notification."); }
    finally { setWorkingId(null); }
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      <TopNav />
      <main className="mx-auto max-w-3xl space-y-5 px-6 pb-10">
        <header>
          <h1 className="text-2xl font-semibold text-white">Notifications</h1>
          <p className="mt-1 text-sm text-neutral-500">Updates from people and conversations you follow.</p>
        </header>
        {error && <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">{error}</p>}
        <section className="rounded-2xl border border-neutral-700 bg-neutral-800 px-5" aria-label="Your notifications">
          {loading ? <p role="status" className="py-8 text-center text-sm text-neutral-500">Loading notifications…</p>
            : notifications.length === 0 ? <div className="py-12 text-center">
              <Bell aria-hidden="true" className="mx-auto mb-3 text-neutral-500" />
              <p className="font-medium text-white">You’re all caught up</p>
              <p className="mt-1 text-sm text-neutral-500">New activity will show up here.</p>
            </div>
            : <ul className="divide-y divide-neutral-700">
              {notifications.map((notification) => (
                <li key={notification.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.is_read ? "bg-neutral-600" : "bg-yellow-400"}`} aria-label={notification.is_read ? "Read" : "Unread"} />
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-100">{notification.message}</p>
                      <p className="mt-1 text-xs text-neutral-500">{new Date(notification.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {!notification.is_read && <button type="button" disabled={workingId === notification.id} onClick={() => markRead(notification)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-700 px-3 py-2 text-xs text-neutral-200 transition hover:bg-neutral-600 disabled:opacity-50">
                    <Check size={14} /> Mark read
                  </button>}
                </li>
              ))}
            </ul>}
        </section>
      </main>
    </div>
  );
}
