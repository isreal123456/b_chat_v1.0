import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  Repeat2,
  ShieldCheck,
  Undo2,
} from "lucide-react";

import AdminShell from "../../../../../components/admin/AdminShell";
import { PageHeader, SectionPanel, StatCard } from "../../../../../components/admin/PageHeader";
import { DataTable } from "../../../../../components/admin/Table";
import StatusBadge from "../../../../../components/admin/StatusBadge";
import ConfirmDialog from "../../../../../components/admin/ConfirmDialog";
import { useAdminToast } from "../../../../../components/admin/ToastProvider";
import {
  fetchAdminPost,
  hasAdminPermission,
  removeAdminComment,
  removeAdminPost,
  restoreAdminComment,
  restoreAdminPost,
} from "../../../../../lib/admin";
import {
  REPORT_REASON_LABELS,
  formatDateTime,
  formatNumber,
  timeAgo,
  truncate,
} from "../../../../../lib/adminFormat";
import { useAuth } from "../../../../../providers/AuthProvider";

export default function AdminPostDetailPage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { push } = useAdminToast();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [postDialog, setPostDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [commentTarget, setCommentTarget] = useState(null);
  const [commentReason, setCommentReason] = useState("");
  const [busy, setBusy] = useState(false);

  const canModerate = hasAdminPermission(me, "content.moderate");

  const load = useCallback(async () => {
    await Promise.resolve();
    setError("");
    try {
      setPost(await fetchAdminPost(id));
    } catch (requestError) {
      setError(requestError.message || "Could not load this post.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const refresh = () => {
    setLoading(true);
    load().then(() => push("Post refreshed", "info"));
  };

  const submitPost = async () => {
    setBusy(true);
    try {
      if (post.moderation_status === "removed") {
        await restoreAdminPost(post.id);
        push(`Post #${post.id} restored`);
      } else {
        await removeAdminPost(post.id, reason.trim());
        push(`Post #${post.id} removed`);
      }
      setPostDialog(false);
      setReason("");
      await load();
    } catch (requestError) {
      push(requestError.message || "Could not update this post.", "error");
    } finally {
      setBusy(false);
    }
  };

  const submitComment = async () => {
    if (!commentTarget) return;
    setBusy(true);
    try {
      const removing = commentTarget.moderation_status !== "removed";
      if (removing) {
        await removeAdminComment(commentTarget.id, commentReason.trim());
        push(`Comment #${commentTarget.id} removed`);
      } else {
        await restoreAdminComment(commentTarget.id);
        push(`Comment #${commentTarget.id} restored`);
      }
      setCommentTarget(null);
      setCommentReason("");
      await load();
    } catch (requestError) {
      push(requestError.message || "Could not update this comment.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !post) {
    return (
      <AdminShell>
        <div className="admin-inline-state" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Loading post…</span>
        </div>
      </AdminShell>
    );
  }

  if (!post) {
    return (
      <AdminShell>
        <PageHeader eyebrow="Moderation" title="Post not found" />
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <Link className="btn btn-secondary" to="/admin/content/posts">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to posts
        </Link>
      </AdminShell>
    );
  }

  const commentColumns = [
    {
      header: "Comment",
      render: (row) => (
        <div className="admin-cell-copy">
          <span>{truncate(row.content, 120)}</span>
          <small>#{row.id} · {formatDateTime(row.created_at)}</small>
        </div>
      ),
    },
    {
      header: "Author",
      render: (row) => (row.author ? `@${row.author.username}` : <span className="admin-muted">Deleted member</span>),
    },
    { header: "Status", render: (row) => <StatusBadge status={row.moderation_status} /> },
    {
      header: "Reports",
      render: (row) => (row.report_count ? <span className="admin-badge admin-badge--danger">{row.report_count}</span> : "—"),
    },
    ...(canModerate
      ? [
          {
            header: "Actions",
            className: "admin-cell--end",
            render: (row) => (
              <button
                type="button"
                className={`btn btn-sm ${row.moderation_status === "removed" ? "btn-secondary" : "btn-danger"}`}
                onClick={() => {
                  setCommentTarget(row);
                  setCommentReason("");
                }}
              >
                {row.moderation_status === "removed" ? "Restore" : "Remove"}
              </button>
            ),
          },
        ]
      : []),
  ];

  const reportColumns = [
    {
      header: "Report",
      render: (row) => (
        <div className="admin-cell-copy">
          <Link className="admin-cell-copy__title" to={`/admin/reports/${row.id}`}>
            {REPORT_REASON_LABELS[row.reason] || row.reason}
          </Link>
          <small>{row.reporter ? `@${row.reporter.username}` : "Deleted reporter"} · {timeAgo(row.created_at)}</small>
        </div>
      ),
    },
    { header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      header: "Details",
      render: (row) => <span className="admin-muted">{truncate(row.details || "—", 80)}</span>,
    },
  ];

  return (
    <AdminShell>
      <Link className="admin-back" to="/admin/content/posts">
        <ArrowLeft size={15} aria-hidden="true" />
        All posts
      </Link>

      <PageHeader
        eyebrow={`Post #${post.id}`}
        title={post.author ? `Post by @${post.author.username}` : "Post by deleted member"}
        description={`Published ${formatDateTime(post.created_at)}`}
        actions={
          <div className="admin-toolbar">
            <button type="button" className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}>
              <RefreshCw size={15} aria-hidden="true" className={loading ? "is-spinning" : ""} />
              Refresh
            </button>
            {canModerate && (
              <button
                type="button"
                className={`btn btn-sm ${post.moderation_status === "removed" ? "btn-primary" : "btn-danger"}`}
                onClick={() => setPostDialog(true)}
              >
                {post.moderation_status === "removed" ? (
                  <>
                    <Undo2 size={15} aria-hidden="true" /> Restore post
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} aria-hidden="true" /> Remove post
                  </>
                )}
              </button>
            )}
          </div>
        }
      />

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {post.moderation_status === "removed" && (
        <div className="alert alert--warning" role="status">
          <div>
            <strong>This post is removed.</strong>
            <p>
              {post.removal_reason || "No reason captured."} · removed {timeAgo(post.removed_at)}
            </p>
          </div>
        </div>
      )}

      <SectionPanel
        title="Content"
        action={<StatusBadge status={post.moderation_status} />}
      >
        <p className="admin-post-body">{post.content || <span className="admin-muted">This post contains media only.</span>}</p>
        {post.project_id && (
          <Link className="admin-text-link" to={`/admin/projects/${post.project_id}`}>
            Attached to project #{post.project_id}
          </Link>
        )}
      </SectionPanel>

      <div className="admin-stat-grid admin-stat-grid--wide">
        <StatCard label="Ticks" value={formatNumber(post.tick_count)} icon={CheckCircle2} tone="teal" />
        <StatCard label="Comments" value={formatNumber(post.comment_count)} icon={MessageSquare} />
        <StatCard label="Reposts" value={formatNumber(post.share_count)} icon={Repeat2} />
        <StatCard label="Reports" value={formatNumber(post.report_count)} icon={ShieldCheck} tone={post.report_count ? "danger" : "default"} />
      </div>

      <div className="admin-two-col">
        <SectionPanel title="Author">
          {post.author ? (
            <div className="admin-author-card">
              <span className="admin-author-card__handle">@{post.author.username}</span>
              <strong>{post.author.name}</strong>
              <span>{post.author.headline || post.author.category || "TickMe member"}</span>
              <Link className="admin-text-link" to={`/admin/users/${post.author.id}`}>
                Open member record
              </Link>
            </div>
          ) : (
            <p className="admin-empty-note">The author account no longer exists.</p>
          )}
        </SectionPanel>

        <SectionPanel title="Reports on this post" description={`${post.reports?.length || 0} total`}>
          <DataTable columns={reportColumns} rows={post.reports || []} empty="No reports for this post." />
        </SectionPanel>
      </div>

      <SectionPanel title="Comments" description={`${post.comments?.length || 0} most recent`}>
        <DataTable
          columns={commentColumns}
          rows={post.comments || []}
          empty="No comments on this post."
        />
      </SectionPanel>

      <ConfirmDialog
        open={postDialog}
        title={post.moderation_status === "removed" ? `Restore post #${post.id}?` : `Remove post #${post.id}?`}
        description={
          post.moderation_status === "removed"
            ? "The post becomes visible to members again. The restore is recorded in the audit log."
            : "The post is hidden from members. The author keeps their content and you can restore it later."
        }
        confirmLabel={post.moderation_status === "removed" ? "Restore post" : "Remove post"}
        tone={post.moderation_status === "removed" ? "primary" : "danger"}
        busy={busy}
        confirmDisabled={post.moderation_status !== "removed" && reason.trim().length < 3}
        onConfirm={submitPost}
        onClose={() => !busy && setPostDialog(false)}
      >
        {post.moderation_status !== "removed" && (
          <label className="admin-field">
            <span>Reason (recorded in the audit log)</span>
            <textarea
              className="textarea"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Harassment / targeted abuse"
            />
          </label>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(commentTarget)}
        title={
          commentTarget?.moderation_status === "removed"
            ? `Restore comment #${commentTarget?.id}?`
            : `Remove comment #${commentTarget?.id}?`
        }
        description={
          commentTarget?.moderation_status === "removed"
            ? "This comment will be visible again. The restore is recorded in the audit log."
            : "The comment is hidden from members and can be restored later."
        }
        confirmLabel={commentTarget?.moderation_status === "removed" ? "Restore comment" : "Remove comment"}
        tone={commentTarget?.moderation_status === "removed" ? "primary" : "danger"}
        busy={busy}
        confirmDisabled={commentTarget?.moderation_status !== "removed" && commentReason.trim().length < 3}
        onConfirm={submitComment}
        onClose={() => !busy && setCommentTarget(null)}
      >
        {commentTarget && <p className="admin-dialog-preview">{truncate(commentTarget.content, 180)}</p>}
        {commentTarget?.moderation_status !== "removed" && (
          <label className="admin-field">
            <span>Reason (recorded in the audit log)</span>
            <textarea
              className="textarea"
              rows={3}
              maxLength={500}
              value={commentReason}
              onChange={(event) => setCommentReason(event.target.value)}
            />
          </label>
        )}
      </ConfirmDialog>
    </AdminShell>
  );
}
