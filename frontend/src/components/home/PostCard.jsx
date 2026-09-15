import { BadgeCheck } from "lucide-react";

export default function PostCard({ post }) {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <img src={post.avatar} alt={post.author} className="w-10 h-10 rounded-lg object-cover" />
        <div className="flex items-baseline gap-2">
          <span className="text-white font-semibold">{post.author}</span>
          {post.verified && <BadgeCheck size={16} className="text-sky-400" />}
          <span className="text-neutral-500 text-sm">· {post.time}</span>
        </div>
      </div>

      <p className="text-neutral-300 text-sm mb-4">{post.text}</p>

      {post.image && (
        <img
          src={post.image}
          alt="Post attachment"
          className="w-full rounded-xl object-cover max-h-96"
        />
      )}
    </div>
  );
}
