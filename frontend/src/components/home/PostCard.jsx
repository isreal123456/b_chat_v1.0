import { BadgeCheck, Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api, fetchAuthenticatedMedia, getMediaUrl } from "../../lib/api";

export default function PostCard({ post, currentUserId }) {
  const mediaPath = post.video || post.image;
  const isVideo = Boolean(post.video);
  const authorName = post.author || `Member ${post.user_id}`;
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [likeError, setLikeError] = useState("");
  const [comments, setComments] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [imageSrc, setImageSrc] = useState("");
  const [mediaLoading, setMediaLoading] = useState(Boolean(mediaPath));
  const [mediaError, setMediaError] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUrl = post.avatar_url || (post.user_id ? `/users/${post.user_id}/avatar` : "");

  useEffect(() => {
    if (!mediaPath) {
      setImageSrc("");
      setMediaLoading(false);
      setMediaError("");
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;
    let objectUrl;
    setImageSrc("");
    setMediaLoading(true);
    setMediaError("");
    fetchAuthenticatedMedia(mediaPath, controller.signal)
      .then((url) => {
        objectUrl = url;
        if (cancelled) URL.revokeObjectURL(url);
        else setImageSrc(url);
      })
      .catch((error) => {
        if (!cancelled) {
          setImageSrc("");
          setMediaError(error.message || "Could not load this media.");
        }
      })
      .finally(() => {
        if (!cancelled) setMediaLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaPath]);

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

  const deleteComment = async (comment) => {
    if (!window.confirm("Delete this comment?")) return;
    setCommentError("");
    setDeletingCommentId(comment.id);
    try {
      await api(`/comments/${comment.id}`, { method: "DELETE" });
      setComments((current) => current.filter((item) => item.id !== comment.id));
    } catch (error) {
      setCommentError(error.message || "Could not delete comment.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <article className="feed-post-card bg-neutral-800 border border-neutral-700 rounded-2xl p-5">
      <div className="feed-post-header">
        <div className="feed-post-avatar" aria-hidden="true">
          {avatarUrl && !avatarFailed ? (
            <img src={getMediaUrl(avatarUrl)} alt="" onError={() => setAvatarFailed(true)} />
          ) : authorName.charAt(0).toUpperCase()}
        </div>
        <div className="feed-post-byline">
          <span className="feed-post-author">{authorName}</span>
          {post.verified && <BadgeCheck size={16} className="text-sky-400" />}
          <span className="feed-post-meta">{post.created_at ? new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Recently"}</span>
        </div>
      </div>

      {post.content && <p className="feed-post-content">{post.content}</p>}

      {mediaLoading && (
        <div className="my-3 rounded-xl bg-neutral-900 px-4 py-8 text-center text-sm text-neutral-500" role="status">
          Loading {isVideo ? "video" : "image"}...
        </div>
      )}
      {mediaError && (
        <div className="my-3 rounded-xl bg-neutral-900 px-4 py-6 text-center text-sm text-neutral-500" role="status">
          {mediaError}. Refresh the feed and make sure the backend is running.
        </div>
      )}
      {imageSrc && isVideo && (
        <video
          src={imageSrc}
          controls
          playsInline
          preload="metadata"
          className="post-video w-full rounded-xl"
          aria-label="Post video"
        />
      )}
      {imageSrc && !isVideo && (
        <img
          src={imageSrc}
          alt="Post attachment"
          className="w-full rounded-xl object-cover max-h-96"
          loading="lazy"
        />
      )}

      <div className="feed-post-actions">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          className={liked ? "feed-post-action is-liked" : "feed-post-action"}
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} />
          {likeCount} {likeCount === 1 ? "Like" : "Likes"}
        </button>
        <button
          type="button"
          onClick={toggleComments}
          aria-expanded={commentsOpen}
          className="feed-post-action"
        >
          <MessageCircle size={16} />
          {comments === null ? (post.comment_count || 0) : comments.length} Comments
        </button>
      </div>
      {likeError && <p role="alert" className="mt-2 text-xs text-red-400">{likeError}</p>}

      {commentsOpen && (
        <section className="feed-comments mt-4 border-t border-neutral-700 pt-4" aria-label="Comments">
          {commentLoading ? (
            <p className="text-sm text-neutral-500">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-neutral-500">No comments yet.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start justify-between gap-3 rounded-lg bg-neutral-900 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-300">@{comment.author}</p>
                    <p className="mt-1 break-words text-sm text-neutral-200">{comment.content}</p>
                  </div>
                  {currentUserId != null && comment.user_id === currentUserId && (
                    <button
                      type="button"
                      onClick={() => deleteComment(comment)}
                      disabled={deletingCommentId === comment.id}
                      aria-label="Delete your comment"
                      title="Delete comment"
                      className="shrink-0 rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
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
    </article>
  );
}
