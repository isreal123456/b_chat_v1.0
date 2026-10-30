import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Circle, MessageCircle, Search, Send } from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import Avatar from "../../components/ui/Avatar";
import { API_BASE_URL, api, fetchConversations, getAccessToken, getMediaUrl } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";

function formatTime(value, style = "short") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (style === "clock") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Conversations({ conversations, activeId, onSelect, loading }) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const filtered = conversations.filter((conversation) =>
    `${conversation.name} ${conversation.username}`.toLowerCase().includes(term),
  );

  return (
    <section className="card conversation-panel" aria-label="Conversations">
      <div className="conversation-panel__head">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.6rem" }}>
          <div>
            <p className="eyebrow">Inbox</p>
            <h1 className="card__title">Messages</h1>
          </div>
          <span className="badge badge--neutral">{conversations.length}</span>
        </div>
        <div className="feed-search">
          <Search size={15} aria-hidden="true" />
          <label htmlFor="conversation-search" className="sr-only">Search conversations</label>
          <input
            id="conversation-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="conversation-list">
        {loading ? (
          <p className="muted" style={{ padding: "1rem", fontSize: "0.82rem" }} role="status">Loading conversations…</p>
        ) : filtered.length === 0 ? (
          <p className="muted" style={{ padding: "1rem", fontSize: "0.82rem", textAlign: "center" }}>
            {conversations.length === 0 ? "No conversations yet. Connect with someone to start one." : "No matches."}
          </p>
        ) : (
          filtered.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={`conversation-item${activeId === conversation.id ? " is-active" : ""}`}
            >
              <Avatar name={conversation.name} src={getMediaUrl(conversation.avatar_url)} size={42} />
              <span className="conversation-item__copy">
                <span className="conversation-item__top">
                  <span className="conversation-item__name">
                    {conversation.name}
                    {conversation.online && (
                      <span className="conversation-item__online" title="Online" aria-label="Online" />
                    )}
                  </span>
                  <span className="conversation-item__time">{formatTime(conversation.time)}</span>
                </span>
                <span className="conversation-item__preview">{conversation.lastMessage}</span>
              </span>
              {conversation.unread > 0 && <span className="unread-count">{conversation.unread}</span>}
            </button>
          ))
        )}
      </div>
    </section>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [threads, setThreads] = useState({});
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const activeIdRef = useRef(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const currentUserId = user?.id;
  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  const thread = threads[activeId] || [];

  useEffect(() => {
    let active = true;
    fetchConversations()
      .then((data) => {
        if (!active) return;
        setConversations(data);
        const requestedId = Number(searchParams.get("user"));
        const requested = data.some((conversation) => conversation.id === requestedId);
        setActiveId((current) => (requested ? requestedId : current || data[0]?.id || null));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load conversations.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!currentUserId) return undefined;
    const interval = setInterval(() => {
      fetchConversations()
        .then((data) => {
          setConversations((current) => {
            const byId = new Map(current.map((conversation) => [conversation.id, conversation]));
            return data.map((conversation) => {
              const existing = byId.get(conversation.id);
              if (!existing) return conversation;
              return {
                ...existing,
                ...conversation,
                unread: activeIdRef.current === conversation.id ? 0 : conversation.unread,
              };
            });
          });
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return undefined;
    const token = getAccessToken();
    if (!token) return undefined;

    const socketUrl = `${API_BASE_URL.replace(/^http/, "ws")}/messages/ws/${currentUserId}?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;
    let disposed = false;

    socket.onopen = () => {
      if (disposed) return;
      setConnected(true);
      setError("");
    };
    socket.onclose = () => {
      if (disposed) return;
      setConnected(false);
    };
    socket.onerror = () => {
      if (disposed) return;
      setConnected(false);
      setError("Message connection unavailable. Check that the API is running.");
    };
    socket.onmessage = (event) => {
      if (disposed) return;
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        setError("Received an unreadable message from the server.");
        return;
      }
      if (message.error) {
        setError(message.error);
        return;
      }
      if (!message.content) return;

      const otherId = message.sender_id === currentUserId ? message.receiver_id : message.sender_id;
      setThreads((current) => ({
        ...current,
        [otherId]: [
          ...(current[otherId] || []),
          {
            id: message.id,
            from: message.sender_id === currentUserId ? "me" : "them",
            text: message.content,
            time: formatTime(message.created_at, "clock"),
          },
        ],
      }));

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === otherId
            ? {
                ...conversation,
                lastMessage: message.content,
                time: message.created_at,
                unread:
                  message.sender_id !== currentUserId && activeIdRef.current !== otherId
                    ? (conversation.unread || 0) + 1
                    : 0,
              }
            : conversation,
        ),
      );
    };

    return () => {
      disposed = true;
      socket.close();
      socketRef.current = null;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !activeId) return undefined;
    let active = true;
    api(`/messages/${activeId}/history`)
      .then((messages) => {
        if (!active) return;
        setThreads((current) => {
          const merged = new Map((current[activeId] || []).map((message) => [message.id, message]));
          messages.forEach((message) => {
            merged.set(message.id, {
              id: message.id,
              from: message.sender_id === currentUserId ? "me" : "them",
              text: message.content,
              time: formatTime(message.created_at, "clock"),
            });
          });
          return { ...current, [activeId]: [...merged.values()].sort((a, b) => a.id - b.id) };
        });
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === activeId ? { ...conversation, unread: 0 } : conversation,
          ),
        );
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load message history.");
      });
    return () => {
      active = false;
    };
  }, [activeId, currentUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread.length, activeId]);

  const sendMessage = (event) => {
    event.preventDefault();
    const draft = event.currentTarget.elements.message.value.trim();
    if (!draft) return;
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("Message connection unavailable. Try again in a moment.");
      return;
    }
    socketRef.current.send(JSON.stringify({ receiver_id: activeId, content: draft }));
    event.currentTarget.elements.message.value = "";
    setError("");
  };

  return (
    <AppShell title="Messages" subtitle="Private threads">
      <div className="page-enter">
        {error && <div className="alert alert--error" role="alert" style={{ marginBottom: "0.8rem" }}>{error}</div>}
        <div className="messages-layout">
          <Conversations
            conversations={conversations}
            activeId={activeId}
            onSelect={setActiveId}
            loading={loading}
          />

          <section className="card chat-panel" aria-label="Conversation">
            {activeConversation ? (
              <>
                <header className="chat-panel__head">
                  <Avatar name={activeConversation.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="card__title">{activeConversation.name}</p>
                    <p className="chat-panel__status">
                      <Circle
                        size={7}
                        fill={activeConversation.online ? "currentColor" : "none"}
                        style={{ color: activeConversation.online ? "var(--teal)" : "var(--muted)" }}
                        aria-hidden="true"
                      />
                      {activeConversation.online ? "Online" : "Offline"}
                      {!connected && <span>· reconnecting…</span>}
                    </p>
                  </div>
                  <Link className="btn btn-ghost btn-sm" to={`/profile/${activeConversation.username}`}>
                    View profile
                  </Link>
                </header>

                <div className="chat-scroll" ref={scrollRef}>
                  {thread.length === 0 ? (
                    <p className="muted" style={{ textAlign: "center", fontSize: "0.82rem", marginTop: "1.5rem" }}>
                      No messages yet. Say hello.
                    </p>
                  ) : (
                    thread.map((message) => (
                      <div key={message.id} className={`message${message.from === "me" ? " message--me" : ""}`}>
                        <div className="message__bubble">
                          {message.text}
                          <p className="message__time">{message.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form className="chat-composer" onSubmit={sendMessage}>
                  <label htmlFor="message-draft" className="sr-only">Write a message</label>
                  <input
                    id="message-draft"
                    name="message"
                    type="text"
                    placeholder="Write a message…"
                    maxLength={5000}
                    disabled={!connected}
                    autoComplete="off"
                  />
                  <button className="btn btn-primary btn-icon" type="submit" disabled={!connected} aria-label="Send message">
                    <Send size={16} aria-hidden="true" />
                  </button>
                </form>
              </>
            ) : (
              <div className="chat-empty">
                <div>
                  <MessageCircle size={30} aria-hidden="true" className="accent-text" />
                  <h2 style={{ marginTop: "0.6rem" }}>Your inbox is ready</h2>
                  <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
                    Connect with someone in Explore to start a private conversation.
                  </p>
                  <Link className="btn btn-primary" to="/explore" style={{ marginTop: "1rem" }}>
                    Find people
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
