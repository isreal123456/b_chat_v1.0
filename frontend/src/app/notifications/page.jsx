import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Flag, Handshake, Mail, MessageCircle, Repeat2, ShieldCheck, UserPlus, UserRoundCheck, UserRoundPlus } from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import { useNotifications } from "../../providers/NotificationProvider";

const iconMap = {
  tick: { icon: Check, tone: "notif-icon--tick", label: "Tick" },
  comment: { icon: MessageCircle, tone: "notif-icon--comment", label: "Comment" },
  friend_request: { icon: UserPlus, tone: "notif-icon--friend", label: "Connection request" },
  friend_accepted: { icon: UserRoundCheck, tone: "notif-icon--friend", label: "Connection accepted" },
  follow: { icon: UserRoundPlus, tone: "notif-icon--friend", label: "New follower" },
  message: { icon: Mail, tone: "notif-icon--message", label: "Message" },
  repost: { icon: Repeat2, tone: "notif-icon--comment", label: "Repost" },
  collaboration_request: { icon: Handshake, tone: "notif-icon--friend", label: "Collaboration request" },
  collaboration_accepted: { icon: UserRoundCheck, tone: "notif-icon--friend", label: "Collaboration accepted" },
  report: { icon: Flag, tone: "notif-icon--comment", label: "Moderation alert" },
  report_update: { icon: ShieldCheck, tone: "notif-icon--tick", label: "Report update" },
};

function formatStamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const {
    unread: unreadCount,
    latest,
    markRead: markNotificationRead,
    markAllRead,
  } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState(null);

  useEffect(() => {
    let active = true;
    api("/notifications")
      .then((data) => {
        if (active) setNotifications(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load notifications.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(() => {
    if (!latest?.id || latest.recipient_id !== user?.id) return notifications;
    return notifications.some((item) => item.id === latest.id)
      ? notifications
      : [latest, ...notifications];
  }, [notifications, latest, user?.id]);

  const markRead = async (notification) => {
    if (notification.is_read) return;
    setWorkingId(notification.id);
    setError("");
    try {
      const updated = await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.some((item) => item.id === updated.id)
          ? current.map((item) => (item.id === updated.id ? updated : item))
          : [updated, ...current],
      );
    } catch (requestError) {
      setError(requestError.message || "Could not update notification.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleMarkAll = async () => {
    setWorkingId("all");
    setError("");
    try {
      await markAllRead();
      setNotifications((current) => {
        const withLatest =
          latest?.id &&
          latest.recipient_id === user?.id &&
          !current.some((item) => item.id === latest.id)
            ? [latest, ...current]
            : current;
        return withLatest.map((item) => ({ ...item, is_read: true }));
      });
    } catch (requestError) {
      setError(requestError.message || "Could not mark notifications as read.");
    } finally {
      setWorkingId(null);
    }
  };

  const unread = items.filter((notification) => !notification.is_read).length;

  return (
    <AppShell title="Notifications" subtitle="Signal from your network">
      <div className="page-enter">
        <header className="page-head">
          <div>
            <p className="eyebrow">Activity</p>
            <h1 className="page-head__title">Notifications</h1>
            <p className="page-head__sub">Ticks, comments, reposts, connections, and messages in one stream.</p>
          </div>
          {(unread > 0 || unreadCount > 0) && (
            <div className="row" style={{ gap: "0.5rem" }}>
              <span className="badge badge--accent badge--dot">{unreadCount} unread</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleMarkAll}
                disabled={workingId === "all"}
              >
                <Check size={14} aria-hidden="true" />
                {workingId === "all" ? "Saving…" : "Mark all read"}
              </button>
            </div>
          )}
        </header>

        {error && <div className="alert alert--error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}

        {loading ? (
          <div className="card list-card" aria-hidden="true">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="list-row">
                <span className="skeleton" style={{ width: 34, height: 34, borderRadius: 10 }} />
                <div style={{ flex: 1, display: "grid", gap: "0.3rem" }}>
                  <span className="skeleton" style={{ width: "58%", height: 12 }} />
                  <span className="skeleton" style={{ width: "24%", height: 10 }} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true"><Bell size={20} /></span>
            <h3>You’re all caught up</h3>
            <p>New ticks, comments, and connection requests will land here.</p>
          </div>
        ) : (
          <ul className="card list-card" aria-label="Your notifications">
            {items.map((notification) => {
              const config = iconMap[notification.type] || { icon: Bell, tone: "", label: "Update" };
              const Icon = config.icon;
              return (
                <li key={notification.id} className="list-row">
                  <span className={`notif-icon ${config.tone}`} aria-label={config.label} title={config.label}>
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div className="list-row__body">
                    <p className="list-row__title">{notification.message}</p>
                    <p className="list-row__meta">{formatStamp(notification.created_at)}</p>
                  </div>
                  {!notification.is_read ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => markRead(notification)}
                      disabled={workingId === notification.id}
                    >
                      <Check size={14} aria-hidden="true" />
                      {workingId === notification.id ? "Saving…" : "Mark read"}
                    </button>
                  ) : (
                    <span className="read-dot" aria-label="Read" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
