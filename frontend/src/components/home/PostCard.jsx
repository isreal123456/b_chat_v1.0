import { BadgeCheck, Heart, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";

export default function PostCard({ post }) {
  const authorName = post.author || `Member ${post.user_id}`;
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [likeError, setLikeError] = useState("");
  const [comments, setComments] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");

  const toggleLike = async () => {
    const nextLiked = !liked;
    setLikeError("");
    try {
      await api(`/likes/${post.id}`, { method: nextLiked ? "POST" : "DELETE" });
      setLiked(nextLiked);
      setLikeCount((count) => count + (nextLiked ? 1 : -1));
    } catch (error) {
      setLikeError(error.message || "Could not update like.");
    }
  };

  const toggleComments = async () => {
    setCommentsOpen((open) => !open);
    if (comments !== null) return;

    setCommentLoading(true);
    setCommentError("");
    try {
      setComments(await api(`/comments/posts/${post.id}/comments`));
    } catch (error) {
      setCommentError(error.message || "Could not load comments.");
      setComments([]);
    } finally {
      setCommentLoading(false);
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    const content = commentText.trim();
    if (!content) return;

    setCommentError("");
    try {
      const comment = await api("/comments/", {
        method: "POST",
        body: JSON.stringify({ post_id: post.id, content }),
      });
      setComments((current) => [...(current || []), comment]);
      setCommentText("");
    } catch (error) {
      setCommentError(error.message || "Could not add comment.");
    }
  };

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-sky-500/15 text-sky-300 flex items-center justify-center font-semibold">
          {authorName.charAt(0).toUpperCase()}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-white font-semibold">{authorName}</span>
          {post.verified && <BadgeCheck size={16} className="text-sky-400" />}
          <span className="text-neutral-500 text-sm">· {post.created_at ? new Date(post.created_at).toLocaleDateString() : "recently"}</span>
        </div>
      </div>

      <p className="text-neutral-300 text-sm leading-6 mb-4">{post.content}</p>

      {post.image && (
        <img
          src={post.image}
          alt="Post attachment"
          className="w-full rounded-xl object-cover max-h-96"
        />
      )}

      <div className="mt-4 flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          className={`flex items-center gap-1.5 transition-colors ${liked ? "text-red-400" : "text-neutral-400 hover:text-white"}`}
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} />
          {likeCount} {likeCount === 1 ? "Like" : "Likes"}
        </button>
        <button
          type="button"
          onClick={toggleComments}
          aria-expanded={commentsOpen}
          className="flex items-center gap-1.5 text-neutral-400 transition-colors hover:text-white"
        >
          <MessageCircle size={16} />
          {comments === null ? (post.comment_count || 0) : comments.length} Comments
        </button>
      </div>
      {likeError && <p role="alert" className="mt-2 text-xs text-red-400">{likeError}</p>}

      {commentsOpen && (
        <section className="mt-4 border-t border-neutral-700 pt-4" aria-label="Comments">
          {commentLoading ? (
            <p className="text-sm text-neutral-500">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-neutral-500">No comments yet.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-lg bg-neutral-900 px-3 py-2">
                  <p className="text-xs font-semibold text-neutral-300">@{comment.author}</p>
                  <p className="mt-1 text-sm text-neutral-200">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={submitComment} className="mt-3 flex items-center gap-2">
            <label htmlFor={`comment-${post.id}`} className="sr-only">Write a comment</label>
            <input
              id={`comment-${post.id}`}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              maxLength={500}
              placeholder="Write a comment..."
              className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button type="submit" disabled={!commentText.trim()} aria-label="Send comment" className="rounded-lg bg-yellow-400 p-2 text-neutral-900 disabled:opacity-50">
              <Send size={16} />
            </button>
          </form>
          {commentError && <p role="alert" className="mt-2 text-xs text-red-400">{commentError}</p>}
        </section>
      )}
    </div>
  );
}
