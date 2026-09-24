"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { Search, Send, MessageCircle, Circle } from "lucide-react";
import TopNav from "../../components/ui/navbar";
import { API_BASE_URL, api, fetchConversations, getAccessToken } from "../../lib/api";

// ---- Small building blocks ----



function ConversationList({ conversations, activeId, onSelect }) {
  const [query, setQuery] = useState("");
  const filteredConversations = conversations.filter((conversation) =>
    conversation.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-yellow-400">Inbox</p>
            <h2 className="text-white text-lg font-semibold">Messages</h2>
          </div>
          <span className="rounded-full bg-neutral-700 px-2.5 py-1 text-xs text-neutral-300">
            {conversations.length}
          </span>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="w-full bg-neutral-900 text-neutral-300 placeholder-neutral-500 rounded-lg pl-9 pr-3 py-2 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-neutral-500">
            {conversations.length === 0 ? "No conversations yet." : "No matches found."}
          </p>
        ) : filteredConversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              activeId === c.id ? "bg-neutral-700/60" : "hover:bg-neutral-700/30"
            }`}
          >
            <div className="relative shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 font-semibold text-neutral-900">
              {c.name.charAt(0).toUpperCase()}
              {c.online && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-neutral-800" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-medium truncate">{c.name}</p>
                <span className="text-neutral-500 text-xs shrink-0">{c.time}</span>
              </div>
              <p className="text-neutral-500 text-xs truncate">{c.lastMessage}</p>
            </div>

            {c.unread > 0 && (
              <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-yellow-400 text-neutral-900 text-[11px] font-semibold rounded-full">
                {c.unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatWindow({ conversation, thread, onSend, connected }) {
  const [draft, setDraft] = useState("");

  if (!conversation) {
    return (
      <div className="bg-neutral-800 border border-neutral-700 rounded-2xl flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
        <MessageCircle size={32} className="mb-3 text-yellow-400" />
        <p className="text-white font-semibold">Your inbox is ready</p>
        <p className="mt-1 max-w-xs text-sm text-neutral-500">Add a friend from Explore to start a private conversation.</p>
        <Link to="/explore" className="mt-5 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-yellow-300">
          Find people
        </Link>
      </div>
    );
  }

  const handleSend = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(conversation.id, draft.trim());
    setDraft("");
  };

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl flex min-h-[560px] flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-700">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 font-semibold text-neutral-900">
          {conversation.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">{conversation.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Circle size={7} fill={connected ? "currentColor" : "none"} className={connected ? "text-emerald-400" : "text-neutral-600"} />
            {connected ? "Ready to chat" : "Connecting..."}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-neutral-900/30 px-5 py-5 space-y-3">
        {thread.length === 0 ? (
            <p className="text-neutral-500 text-sm text-center mt-10">
            No messages yet. Say hello.
          </p>
        ) : (
          thread.map((m) => (
            <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  m.from === "me"
                    ? "bg-yellow-400 text-neutral-900 rounded-br-sm"
                    : "bg-neutral-700 text-neutral-200 rounded-bl-sm"
                }`}
              >
                <p>{m.text}</p>
                <p className={`text-[10px] mt-1 ${m.from === "me" ? "text-neutral-800/70" : "text-neutral-400"}`}>
                  {m.time}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-4 border-t border-neutral-700">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message..."
          disabled={!connected}
          aria-label="Write a message"
          className="flex-1 bg-neutral-900 text-neutral-300 placeholder-neutral-500 rounded-full px-4 py-2.5 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <button
          type="submit"
          disabled={!connected}
          aria-label="Send message"
          className="p-2.5 bg-yellow-400 hover:bg-yellow-300 text-neutral-900 rounded-full transition-colors shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

// ---- Page ----

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [threads, setThreads] = useState({});
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const activeConversation = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    fetchConversations().then((data) => {
      setConversations(data);
      const requestedId = Number(searchParams.get("user"));
      setActiveId((current) => current || (data.some((conversation) => conversation.id === requestedId) ? requestedId : data[0]?.id) || null);
    }).catch((requestError) => {
      setError(requestError.message || "Could not load conversations.");
    }).finally(() => setLoading(false));
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    api("/profile")
      .then((user) => {
        if (active) setCurrentUserId(user.id);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load your profile.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return undefined;

    const token = getAccessToken();
    if (!token) return undefined;

    const websocketUrl = API_BASE_URL.replace(/^http/, "ws") +
      `/messages/ws/${currentUserId}?token=${encodeURIComponent(token)}`;
    const nextSocket = new WebSocket(websocketUrl);
    socketRef.current = nextSocket;
    nextSocket.onopen = () => setConnected(true);
    nextSocket.onclose = () => setConnected(false);
    nextSocket.onerror = () => {
      setConnected(false);
      setError("Message connection unavailable. Check that the API is running.");
    };
    nextSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.error) {
        setError(message.error);
        return;
      }
      if (!message.content) return;
      const conversationId = message.sender_id === currentUserId
        ? message.receiver_id
        : message.sender_id;
      setThreads((current) => ({
        ...current,
        [conversationId]: [
          ...(current[conversationId] || []),
          { id: message.id, from: message.sender_id === currentUserId ? "me" : "them", text: message.content, time: new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
        ],
      }));
    };

    return () => {
      nextSocket.close();
      socketRef.current = null;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !activeId) return;
    api(`/messages/${activeId}/history`)
      .then((messages) => setThreads((current) => ({
        ...current,
        [activeId]: messages.map((message) => ({
          id: message.id,
          from: message.sender_id === currentUserId ? "me" : "them",
          text: message.content,
          time: new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        })),
      })))
      .catch(() => setThreads((current) => ({ ...current, [activeId]: [] })));
  }, [activeId, currentUserId]);

  const sendMessage = (receiverId, content) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("Message connection unavailable. Try again in a moment.");
      return;
    }
    socketRef.current.send(JSON.stringify({ receiver_id: receiverId, content }));
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      <TopNav />

      <div className="max-w-7xl mx-auto w-full flex-1 px-6 pb-6">
        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 min-h-[calc(100vh-120px)] md:h-[calc(100vh-120px)]">
          {loading ? (
            <div className="rounded-2xl border border-neutral-700 bg-neutral-800 p-6 text-sm text-neutral-400">
              Loading conversations...
            </div>
          ) : (
            <>
              <ConversationList conversations={conversations} activeId={activeId} onSelect={setActiveId} />
              <ChatWindow
                conversation={activeConversation}
                thread={threads[activeId] || []}
                onSend={sendMessage}
                connected={connected}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}