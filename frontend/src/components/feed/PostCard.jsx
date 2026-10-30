import { BadgeCheck, Bookmark, BookmarkCheck, Flag, MessageCircle, Repeat2, Send, Trash2, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Avatar from "../ui/Avatar";
import ProjectCover from "../projects/ProjectCover";
import ReportDialog from "../reports/ReportDialog";
import {
  api,
  fetchAuthenticatedMedia,
  fetchTickCount,
  fetchWhoTicked,
  getMediaUrl,
  repostPost,
  savePost,
  tickPost,
  unrepostPost,
  unsavePost,
  untickPost,
} from "../../lib/api";
import { formatCount } from "../../lib/utils";
import { truncate } from "../../lib/adminFormat";

const TickIcon = ({ size = 17 }) => (
  <svg
    className="tick-icon"
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="3,10 8,15 17,5" />
  </svg>
);

function TickButton({ ticked, tickCount, onToggle, disabled }) {
  const [burst, setBurst] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const handleClick = () => {
    if (!ticked) {
      setBurst(true);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setBurst(false), 620);
    }
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={ticked}
      disabled={disabled}
      title={ticked ? "Remove your Tick" : "Tick this post"}
      className={[
        "tick-btn",
        ticked ? "tick-btn--active" : "",
        burst ? "tick-btn--burst" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <TickIcon />
      <span>
        {formatCount(tickCount)} {tickCount === 1 ? "Tick" : "Ticks"}
      </span>
    </button>
  );
}

function WhoTickedPopover({ postId, onClose }) {
  const [users, setUsers] = useState(null);

  useEffect(() => {
    let active = true;
    fetchWhoTicked(postId)
      .then((data) => {
        if (active) setUsers(data);
      })
      .catch(() => {
        if (active) setUsers([]);
      });
    return () => {
      active = false;
    };
  }, [postId]);

  return (
    <div className="tick-popover" role="dialog" aria-label="People who ticked this post">
      <div className="tick-popover__header">
        <span>Ticked by</span>
        <button type="button" onClick={onClose} aria-label="Close" className="tick-popover__close">
          ✕
        </button>
      </div>
      {users === null && <p className="tick-popover__state">Loading…</p>}
      {users?.length === 0 && <p className="tick-popover__state">No ticks yet — be the first.</p>}
      {users?.length > 0 && (
        <ul className="tick-popover__list">
          {users.map((person) => (
            <li key={person.id} className="tick-popover__user">
              <span className="tick-popover__avatar">
                <img
                  src={getMediaUrl(person.avatar_url)}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <span aria-hidden="true">{(person.name || person.username).charAt(0).toUpperCase()}</span>
              </span>
              <span className="tick-popover__info">
                <span className="tick-popover__name">{person.name || person.username}</span>
                <span className="tick-popover__handle">@{person.username}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PostMedia({ path, isVideo }) {
  const [source, setSource] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let objectUrl;

    fetchAuthenticatedMedia(path, controller.signal)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSource(url);
      })
      .catch((requestError) => {
        if (!cancelled && requestError.name !== "AbortError") {
          setError(requestError.message || "Could not load this media.");
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (error) {
    return <div className="post-card__media post-card__media-state">{error}</div>;
  }

  if (!source) {
    return (
      <div className="post-card__media post-card__media-state">
        <span className="skeleton" style={{ display: "block", width: "100%", height: 190 }} />
      </div>
    );
  }

  return (
    <div className="post-card__media">
      {isVideo ? (
        <video src={source} controls playsInline preload="metadata" aria-label="Post video" />
      ) : (
        <img src={source} alt="Post attachment" loading="lazy" />
      )}
    </div>
  );
}

function formatStamp(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PostCard({ post, currentUserId }) {
  const mediaPath = post.video || post.image;
  const isVideo = Boolean(post.video);
  const authorName = post.author || `Member ${post.user_id}`;
  const avatarUrl = `/users/${post.user_id}/avatar`;

  const [ticked, setTicked] = useState(Boolean(post.ticked));
  const [tickCount, setTickCount] = useState(post.tick_count ?? 0);
  const [tickError, setTickError] = useState("");
  const [tickLoading, setTickLoading] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);

  const [shared, setShared] = useState(Boolean(post.shared));
  const [shareCount, setShareCount] = useState(post.share_count ?? 0);
  const [sharing, setSharing] = useState(false);
  const [saved, setSaved] = useState(Boolean(post.saved));
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const [comments, setComments] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);

  const toggleTick = async () => {
    if (tickLoading) return;
    const nextTicked = !ticked;
    setTickError("");
    setTickLoading(true);
    setTicked(nextTicked);
    setTickCount((count) => Math.max(0, count + (nextTicked ? 1 : -1)));

    try {
      if (nextTicked) await tickPost(post.id);
      else await untickPost(post.id);
      const result = await fetchTickCount(post.id);
      setTicked(result.ticked);
      setTickCount(result.tick_count);
    } catch (error) {
      setTicked(!nextTicked);
      setTickCount((count) => Math.max(0, count + (nextTicked ? -1 : 1)));
      setTickError(error.message || "Could not update this Tick.");
    } finally {
      setTickLoading(false);
    }
  };

  const toggleRepost = async () => {
    if (sharing) return;
    const nextShared = !shared;
    setActionError("");
    setSharing(true);
    setShared(nextShared);
    setShareCount((count) => Math.max(0, count + (nextShared ? 1 : -1)));

    try {
      const result = nextShared ? await repostPost(post.id) : await unrepostPost(post.id);
      setShared(result.shared);
      setShareCount(result.share_count);
    } catch (error) {
      setShared(!nextShared);
      setShareCount((count) => Math.max(0, count + (nextShared ? -1 : 1)));
      setActionError(error.message || "Could not update this repost.");
    } finally {
      setSharing(false);
    }
  };

  const toggleSave = async () => {
    if (saving) return;
    const nextSaved = !saved;
    setActionError("");
    setSaving(true);
    setSaved(nextSaved);

    try {
      const result = nextSaved ? await savePost(post.id) : await unsavePost(post.id);
      setSaved(result.saved);
    } catch (error) {
      setSaved(!nextSaved);
      setActionError(error.message || "Could not update your saved posts.");
    } finally {
      setSaving(false);
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

  const commentTotal = comments === null ? post.comment_count || 0 : comments.length;

  return (
    <article className="card post-card">
      {post.reposted_by && (
        <p className="post-card__repost">
          <Repeat2 size={14} aria-hidden="true" />
          <Link to={`/profile/${post.reposted_by.username}`}>{post.reposted_by.name}</Link> reposted
        </p>
      )}

      <header className="post-card__head">
        <Link to={`/profile/${post.username || post.user_id}`} aria-label={`${authorName}'s profile`}>
          <Avatar name={authorName} src={getMediaUrl(avatarUrl)} size={44} />
        </Link>
        <div className="post-card__byline">
          <Link className="post-card__author" to={`/profile/${post.username || post.user_id}`}>
            {authorName}
            {post.verified && <BadgeCheck size={15} aria-label="Verified" />}
          </Link>
          <div className="post-card__meta">
            <span>@{post.username}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.created_at}>{formatStamp(post.created_at)}</time>
          </div>
        </div>
      </header>

      {post.content && <p className="post-card__body">{post.content}</p>}

      {post.project && (
        <Link className="post-project" to={`/projects/${post.project.id}`}>
          <ProjectCover project={post.project} className="post-project__cover" />
          <span className="post-project__body">
            <span className="post-project__label">Project update</span>
            <span className="post-project__title">{post.project.title}</span>
          </span>
        </Link>
      )}

      {mediaPath && <PostMedia path={mediaPath} isVideo={isVideo} />}

      <div className="post-card__actions">
        <TickButton ticked={ticked} tickCount={tickCount} onToggle={toggleTick} disabled={tickLoading} />

        {tickCount > 0 && (
          <div className="tick-who">
            <button
              type="button"
              onClick={() => setWhoOpen((open) => !open)}
              className="post-action"
              aria-expanded={whoOpen}
              aria-label="See who ticked this"
              title="See who ticked this"
            >
              <Users size={16} aria-hidden="true" />
            </button>
            {whoOpen && <WhoTickedPopover postId={post.id} onClose={() => setWhoOpen(false)} />}
          </div>
        )}

        <button
          type="button"
          onClick={toggleComments}
          aria-expanded={commentsOpen}
          className="post-action"
        >
          <MessageCircle size={16} aria-hidden="true" />
          {formatCount(commentTotal)} {commentTotal === 1 ? "Comment" : "Comments"}
        </button>

        <button
          type="button"
          onClick={toggleRepost}
          aria-pressed={shared}
          disabled={sharing}
          title={shared ? "Undo repost" : "Repost to your followers"}
          className={`post-action post-action--repost${shared ? " is-active" : ""}`}
        >
          <Repeat2 size={16} aria-hidden="true" />
          {formatCount(shareCount)} {shareCount === 1 ? "Repost" : "Reposts"}
        </button>

        <button
          type="button"
          onClick={toggleSave}
          aria-pressed={saved}
          disabled={saving}
          title={saved ? "Remove bookmark" : "Save for later"}
          className={`post-action post-action--save${saved ? " is-active" : ""}`}
        >
          {saved ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
          {saved ? "Saved" : "Save"}
        </button>

        {currentUserId != null && post.user_id !== currentUserId && (
          <button
            type="button"
            onClick={() =>
              setReportTarget({
                type: "post",
                id: post.id,
                label: post.content ? truncate(post.content, 80) : `Post by @${post.username}`,
              })
            }
            title="Report this post"
            aria-label="Report this post"
            className="post-action post-action--report"
          >
            <Flag size={16} aria-hidden="true" />
            Report
          </button>
        )}
      </div>

      {(tickError || actionError) && (
        <p role="alert" className="muted" style={{ fontSize: "0.75rem" }}>
          {tickError || actionError}
        </p>
      )}

      {commentsOpen && (
        <section className="comments" aria-label="Comments">
          {commentLoading ? (
            <p className="muted" style={{ fontSize: "0.82rem" }}>Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="muted" style={{ fontSize: "0.82rem" }}>No comments yet — start the thread.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="comment">
                <div>
                  <p className="comment__author">@{comment.author}</p>
                  <p className="comment__body">{comment.content}</p>
                </div>
                {currentUserId != null && (
                  <div className="comment__actions">
                    {comment.user_id !== currentUserId ? (
                      <button
                        type="button"
                        onClick={() =>
                          setReportTarget({
                            type: "comment",
                            id: comment.id,
                            label: truncate(comment.content, 80),
                          })
                        }
                        aria-label="Report this comment"
                        title="Report comment"
                        className="comment__delete"
                      >
                        <Flag size={14} aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => deleteComment(comment)}
                        disabled={deletingCommentId === comment.id}
                        aria-label="Delete your comment"
                        title="Delete comment"
                        className="comment__delete"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          <form onSubmit={submitComment} className="comment-form">
            <label htmlFor={`comment-${post.id}`} className="sr-only">Write a comment</label>
            <input
              id={`comment-${post.id}`}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              maxLength={500}
              placeholder="Write a comment…"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              aria-label="Send comment"
              className="btn btn-primary btn-sm"
            >
              <Send size={15} aria-hidden="true" />
            </button>
          </form>

          {commentError && (
            <p role="alert" className="muted" style={{ fontSize: "0.75rem" }}>{commentError}</p>
          )}
        </section>
      )}

      {reportTarget && (
        <ReportDialog
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetLabel={reportTarget.label}
          onClose={() => setReportTarget(null)}
        />
      )}
    </article>
  );
}
