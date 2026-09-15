"use client";

import { useState } from "react";
import {
  Home,
  Users,
  MessageCircle,
  Settings,
  Search,
  UserPlus,
  UserCheck,
  MessageSquare,
  X,
} from "lucide-react";
import TopNav from "../../components/ui/navbar";
// ---- Mock data (swap for real API calls later) ----

const friends = [
  { id: 1, name: "George Jose", username: "george", avatar: "https://i.pravatar.cc/150?img=13", mutual: 12 },
  { id: 2, name: "Michel", username: "michel", avatar: "https://i.pravatar.cc/150?img=20", mutual: 8 },
  { id: 3, name: "Cristano", username: "cristano", avatar: "https://i.pravatar.cc/150?img=21", mutual: 24 },
  { id: 4, name: "Brahim diaz", username: "brahim", avatar: "https://i.pravatar.cc/150?img=22", mutual: 5 },
  { id: 5, name: "John wick", username: "johnwick", avatar: "https://i.pravatar.cc/150?img=23", mutual: 17 },
  { id: 6, name: "Chris", username: "chris", avatar: "https://i.pravatar.cc/150?img=17", mutual: 3 },
];

const suggestions = [
  { id: 7, name: "Simon pk", username: "simonpk", avatar: "https://i.pravatar.cc/150?img=12", mutual: 6 },
  { id: 8, name: "Jhon", username: "jhon", avatar: "https://i.pravatar.cc/150?img=13", mutual: 2 },
  { id: 9, name: "Rishal", username: "rishal", avatar: "https://i.pravatar.cc/150?img=14", mutual: 9 },
  { id: 10, name: "Fedrick", username: "fedrick", avatar: "https://i.pravatar.cc/150?img=15", mutual: 4 },
];

// ---- Small building blocks ----


function PersonCard({ person, variant, onAction, onDismiss }) {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5 flex flex-col items-center text-center relative">
      {variant === "suggestion" && (
        <button
          onClick={() => onDismiss(person.id)}
          className="absolute top-3 right-3 text-neutral-500 hover:text-white"
        >
          <X size={15} />
        </button>
      )}

      <img
        src={person.avatar}
        alt={person.name}
        className="w-16 h-16 rounded-2xl object-cover mb-3"
      />
      <p className="text-white text-sm font-semibold">{person.name}</p>
      <p className="text-neutral-500 text-xs mb-1">@{person.username}</p>
      <p className="text-neutral-500 text-xs mb-4">{person.mutual} mutual friends</p>

      <div className="flex gap-2 w-full">
        {variant === "friend" ? (
          <>
            <button className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-medium rounded-lg py-2 transition-colors">
              <UserCheck size={14} />
              Friends
            </button>
            <button className="p-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors">
              <MessageSquare size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={() => onAction(person.id)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-neutral-900 text-xs font-semibold rounded-lg py-2 transition-colors"
          >
            <UserPlus size={14} />
            Add Friend
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Page ----

export default function FriendsPage() {
  const [query, setQuery] = useState("");
  const [suggestionList, setSuggestionList] = useState(suggestions);
  const [added, setAdded] = useState([]);

  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleAdd = (id) => {
    setAdded([...added, id]);
    setSuggestionList(suggestionList.filter((s) => s.id !== id));
  };

  const handleDismiss = (id) => {
    setSuggestionList(suggestionList.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      <TopNav />

      <div className="max-w-5xl mx-auto px-6 pb-10 space-y-8">
        {/* Header + search */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-semibold">Friends</h1>
            <p className="text-neutral-500 text-sm">{friends.length} people you're connected with</p>
          </div>
          <div className="relative w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search friends"
              className="w-full bg-neutral-800 text-neutral-300 placeholder-neutral-500 rounded-lg pl-9 pr-4 py-2 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>

        {/* Suggestions */}
        {suggestionList.length > 0 && (
          <section>
            <h2 className="text-white font-semibold mb-4">People you may know</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {suggestionList.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  variant="suggestion"
                  onAction={handleAdd}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          </section>
        )}

        {/* Friends list */}
        <section>
          <h2 className="text-white font-semibold mb-4">Your friends</h2>
          {filteredFriends.length === 0 ? (
            <p className="text-neutral-500 text-sm">No friends match "{query}".</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFriends.map((person) => (
                <PersonCard key={person.id} person={person} variant="friend" />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}