/* eslint-disable react-refresh/only-export-components -- provider modules intentionally co-locate their context hook */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { API_BASE_URL, api, getAccessToken } from "../lib/api";
import { useAuth } from "./AuthProvider";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [unread, setUnread] = useState(0);
  const [latest, setLatest] = useState(null);
  const socketRef = useRef(null);

  const refreshUnread = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const data = await api("/notifications/unread-count");
      setUnread(Number(data?.count) || 0);
    } catch {
      // Transient network errors should not interrupt the app shell.
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined;

    api("/notifications/unread-count")
      .then((data) => setUnread(Number(data?.count) || 0))
      .catch(() => {});

    const token = getAccessToken();
    if (!token) return undefined;

    let disposed = false;
    let reconnectTimer = null;
    let attempts = 0;

    const connect = () => {
      const socket = new WebSocket(
        `${API_BASE_URL.replace(/^http/, "ws")}/ws/${user.id}?token=${encodeURIComponent(token)}`,
      );
      socketRef.current = socket;

      socket.onopen = () => {
        attempts = 0;
      };
      socket.onmessage = (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!payload?.id) return;
        setLatest(payload);
        if (!payload.is_read) setUnread((count) => count + 1);
      };
      socket.onclose = () => {
        if (disposed) return;
        attempts += 1;
        reconnectTimer = setTimeout(connect, Math.min(15000, 1500 * attempts));
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, refreshUnread]);

  const markRead = useCallback(async (id) => {
    const updated = await api(`/notifications/${id}/read`, { method: "PATCH" });
    setUnread((count) => Math.max(0, count - 1));
    return updated;
  }, []);

  const markAllRead = useCallback(async () => {
    const result = await api("/notifications/read-all", { method: "PATCH" });
    setUnread(0);
    return result;
  }, []);

  const value = useMemo(
    () => ({ unread, latest, refreshUnread, markRead, markAllRead }),
    [unread, latest, refreshUnread, markRead, markAllRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used inside NotificationProvider");
  return context;
}
