"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";

export default function PostComposer() {
  const [text, setText] = useState("");

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 flex items-center gap-3">
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
      <button className="p-2.5 rounded-lg bg-neutral-700 text-neutral-300 hover:text-yellow-400 transition-colors shrink-0">
        <ImageIcon size={18} />
      </button>
    </div>
  );
}
