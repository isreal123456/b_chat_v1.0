"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Send, Paperclip, MoreVertical, } from "lucide-react";
import TopNav from "../../components/ui/navbar";
import { API_BASE_URL, api, getAccessToken } from "../../lib/api";

const conversations = [
  {
    id: 1,
    name: "George Jose",
    avatar: "https://i.pravatar.cc/100?img=13",
    lastMessage: "That looks great, let's ship it",
    time: "2m",
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: "Michel",
    avatar: "https://i.pravatar.cc/100?img=20",
    lastMessage: "Can you send the files?",
    time: "1h",
    unread: 0,
    online: true,
  },
  {
    id: 3,
    name: "Cristano",
    avatar: "https://i.pravatar.cc/100?img=21",
    lastMessage: "Thanks for the follow back!",
    time: "3h",
    unread: 0,
    online: false,
  },
  {
    id: 4,
    name: "Brahim diaz",
    avatar: "https://i.pravatar.cc/100?img=22",
    lastMessage: "Let's catch up this weekend",
    time: "1d",
    unread: 0,
    online: false,
  },
  {
    id: 5,
    name: "John wick",
    avatar: "https://i.pravatar.cc/100?img=23",
    lastMessage: "Nice project 🔥",
    time: "2d",
    unread: 0,
    online: false,
  },
];

// ---- Small building blocks ----



function ConversationList({ activeId, onSelect }) {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-neutral-700">
        <h2 className="text-white font-semibold mb-3">Messages</h2>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search conversations"
            className="w-full bg-neutral-900 text-neutral-300 placeholder-neutral-500 rounded-lg pl-9 pr-3 py-2 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              activeId === c.id ? "bg-neutral-700/60" : "hover:bg-neutral-700/30"
            }`}
          >
            <div className="relative shrink-0">
              <img src={c.avatar} alt={c.name} className="w-11 h-11 rounded-xl object-cover" />
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

  const handleSend = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(conversation.id, draft.trim());
    setDraft("");
  };

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-700">
        <img src={conversation.avatar} alt={conversation.name} className="w-10 h-10 rounded-xl object-cover" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">{conversation.name}</p>
          <p className="text-xs text-neutral-500">{connected ? "Connected" : "Offline"}</p>
        </div>
        <button className="text-neutral-400 hover:text-white">
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {thread.length === 0 ? (
          <p className="text-neutral-500 text-sm text-center mt-10">
            No messages yet. Say hello
          </p>
        ) : (
          thread.map((m) => (
            <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
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
        <button type="button" className="p-2 text-neutral-400 hover:text-white shrink-0">
          <Paperclip size={18} />
        </button>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message..."
          disabled={!connected}
          className="flex-1 bg-neutral-900 text-neutral-300 placeholder-neutral-500 rounded-full px-4 py-2.5 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <button
          type="submit"
          disabled={!connected}
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
  const [activeId, setActiveId] = useState(conversations[0].id);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [threads, setThreads] = useState({});
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const activeConversation = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    let active = true;
    api("/profile")
      .then((user) => {
        if (active) setCurrentUserId(user.id);
      })
      .catch(() => setCurrentUserId(null));

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
    nextSocket.onerror = () => setConnected(false);
    nextSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.content) return;
      setThreads((current) => ({
        ...current,
        [message.sender_id]: [
          ...(current[message.sender_id] || []),
          { id: message.id, from: "them", text: message.content, time: new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
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
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ receiver_id: receiverId, content }));
    setThreads((current) => ({
      ...current,
      [receiverId]: [
        ...(current[receiverId] || []),
        { id: `local-${Date.now()}`, from: "me", text: content, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ],
    }));
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      <TopNav />

      <div className="max-w-7xl mx-auto w-full flex-1 px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 h-[calc(100vh-120px)]">
          <ConversationList activeId={activeId} onSelect={setActiveId} />
          <ChatWindow
            conversation={activeConversation}
            thread={threads[activeId] || []}
            onSend={sendMessage}
            connected={connected}
          />
        </div>
      </div>
    </div>
  );
}