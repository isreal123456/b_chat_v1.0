"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export default function PostComposer({ onPostCreated }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const content = text.trim();

    if (!content) {
      setError("Write something before posting.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await onPostCreated(content);
      setText("");
    } catch (requestError) {
      setError(requestError.message || "Could not create the post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4">
      <div className="flex items-center gap-3">
      <img
        src="https://i.pravatar.cc/100?img=68"
        alt="You"
        className="w-10 h-10 rounded-lg object-cover shrink-0"
      />
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell your friends about your thoughts.."
        className="flex-1 bg-neutral-900 text-neutral-300 placeholder-neutral-500 rounded-lg px-4 py-2.5 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-2 rounded-lg bg-yellow-400 px-3 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60 shrink-0"
      >
        <Send size={16} />
        {submitting ? "Posting..." : "Post"}
      </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </form>
  );
}
