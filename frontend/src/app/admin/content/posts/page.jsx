import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FilterX, RefreshCw, Search, ShieldCheck, Undo2 } from "lucide-react";

import AdminShell from "../../../../components/admin/AdminShell";
import { PageHeader, SectionPanel } from "../../../../components/admin/PageHeader";
import { DataTable, Pagination } from "../../../../components/admin/Table";
import StatusBadge from "../../../../components/admin/StatusBadge";
import ConfirmDialog from "../../../../components/admin/ConfirmDialog";
import { useAdminToast } from "../../../../components/admin/ToastProvider";
import { fetchAdminPosts, removeAdminPost, restoreAdminPost } from "../../../../lib/admin";
import { formatDateTime, formatNumber, timeAgo, truncate } from "../../../../lib/adminFormat";

const PAGE_SIZE = 20;
const FILTER_DEFAULTS = { q: "", status: "", reported: "", sort: "newest", author_id: "" };

export default function AdminPostsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { push } = useAdminToast();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const filters = useMemo(
    () => ({
      q: searchParams.get("q") || "",
      status: searchParams.get("status") || "",
      reported: searchParams.get("reported") ? "true" : "",
      sort: searchParams.get("sort") || "newest",
      author_id: searchParams.get("author_id") || "",
    }),
    [searchParams],
  );
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const updateParams = useCallback(
    (changes, { replace = false } = {}) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(changes).forEach(([key, value]) => {
        if (!value || value === FILTER_DEFAULTS[key]) next.delete(key);
        else next.set(key, value);
      });
      if (changes.page === undefined && Object.keys(changes).some((key) => key !== "page")) next.delete("page");
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((filters.q || "") === search.trim()) return;
      updateParams({ q: search.trim() }, { replace: true });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [search, filters.q, updateParams]);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      setResult(
        await fetchAdminPosts({
          ...filters,
          reported: filters.reported === "true",
          author_id: filters.author_id || undefined,
          page,
          page_size: PAGE_SIZE,
        }),
      );
    } catch (requestError) {
      setError(requestError.message || "Could not load posts.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const closeDialog = () => {
    if (busy) return;
    setTarget(null);
    setReason("");
  };

  const submitModeration = async () => {
    if (!target) return;
    setBusy(true);
    try {
      if (target.moderation_status === "removed") {
        await restoreAdminPost(target.id);
        push(`Post #${target.id} restored`);
      } else {
        await removeAdminPost(target.id, reason.trim());
        push(`Post #${target.id} removed`);
      }
      setTarget(null);
      setReason("");
      await load();
    } catch (requestError) {
      push(requestError.message || "Could not update this post.", "error");
    } finally {
      setBusy(false);
    }
  };

  const hasFilters = Object.entries(filters).some(([key, value]) => key !== "sort" && Boolean(value));

  const columns = [
    {
      header: "Post",
      render: (row) => (
        <div className="admin-cell-copy">
          <Link className="admin-cell-copy__title" to={`/admin/content/posts/${row.id}`} onClick={(event) => event.stopPropagation()}>
            {truncate(row.content || "(media only)", 108)}
          </Link>
          <small>#{row.id} · {formatDateTime(row.created_at)}</small>
        </div>
      ),
    },
    {
      header: "Author",
      render: (row) =>
        row.author ? (
          <div className="admin-cell-copy">
            <span>@{row.author.username}</span>
            <small>{row.author.name}</small>
          </div>
        ) : (
          <span className="admin-muted">Deleted member</span>
        ),
    },
    { header: "Status", render: (row) => <StatusBadge status={row.moderation_status} /> },
    { header: "Ticks", className: "admin-col-secondary", render: (row) => <span className="admin-mono">{formatNumber(row.tick_count)}</span> },
    { header: "Comments", className: "admin-col-secondary", render: (row) => <span className="admin-mono">{formatNumber(row.comment_count)}</span> },
    {
      header: "Reports",
      render: (row) =>
        row.report_count ? (
          <span className="admin-badge admin-badge--danger">{formatNumber(row.report_count)}</span>
        ) : (
          <span className="admin-muted">—</span>
        ),
    },
    {
      header: "Actions",
      className: "admin-cell--end",
      render: (row) => (
        <div className="admin-row-actions" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className={`btn btn-sm ${row.moderation_status === "removed" ? "btn-secondary" : "btn-danger"}`}
            onClick={() => {
              setTarget(row);
              setReason("");
            }}
          >
            {row.moderation_status === "removed" ? (
              <>
                <Undo2 size={14} aria-hidden="true" /> Restore
              </>
            ) : (
              <>
                <ShieldCheck size={14} aria-hidden="true" /> Remove
              </>
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Moderation"
        title="Posts"
        description="Review every post on TickMe. Removals are reversible and always recorded."
        actions={
          <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={15} aria-hidden="true" className={loading ? "is-spinning" : ""} />
            Refresh
          </button>
        }
      />

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      <SectionPanel>
        <div className="admin-filterbar">
          <div className="admin-search">
            <Search size={16} aria-hidden="true" />
            <label htmlFor="admin-post-search" className="sr-only">Search posts</label>
            <input
              id="admin-post-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search post text…"
              autoComplete="off"
            />
          </div>
          <label className="admin-field">
            <span>Visibility</span>
            <select className="input admin-select" value={filters.status} onChange={(event) => updateParams({ status: event.target.value })}>
              <option value="">All posts</option>
              <option value="published">Published</option>
              <option value="removed">Removed</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Reports</span>
            <select className="input admin-select" value={filters.reported} onChange={(event) => updateParams({ reported: event.target.value })}>
              <option value="">Any</option>
              <option value="true">Has open reports</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Sort</span>
            <select className="input admin-select" value={filters.sort} onChange={(event) => updateParams({ sort: event.target.value })}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          {filters.author_id && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateParams({ author_id: "" })}>
              Author #{filters.author_id} ×
            </button>
          )}
          {hasFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch("");
                setSearchParams(new URLSearchParams(), { replace: true });
              }}
            >
              <FilterX size={15} aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        <DataTable
          columns={columns}
          rows={result?.items || []}
          loading={loading}
          empty="No posts match these filters."
          onRowClick={(row) => navigate(`/admin/content/posts/${row.id}`)}
        />

        <Pagination
          page={page}
          pages={result?.pages || 1}
          total={result?.total || 0}
          pageSize={PAGE_SIZE}
          onPageChange={(next) => updateParams({ page: String(next) })}
        />
      </SectionPanel>

      <ConfirmDialog
        open={Boolean(target)}
        title={
          target?.moderation_status === "removed"
            ? `Restore post #${target?.id}?`
            : `Remove post #${target?.id}?`
        }
        description={
          target?.moderation_status === "removed"
            ? "The post will be visible again on TickMe. The restore is recorded in the audit log."
            : "The post will be hidden from members. The author keeps their content and you can restore it later."
        }
        confirmLabel={target?.moderation_status === "removed" ? "Restore post" : "Remove post"}
        tone={target?.moderation_status === "removed" ? "primary" : "danger"}
        busy={busy}
        confirmDisabled={target?.moderation_status !== "removed" && reason.trim().length < 3}
        onConfirm={submitModeration}
        onClose={closeDialog}
      >
        {target?.moderation_status !== "removed" && (
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
        {target && (
          <p className="admin-dialog-preview">
            {truncate(target.content || "(media only)", 180)} · {target.author ? `@${target.author.username}` : "deleted member"} ·{" "}
            {timeAgo(target.created_at)}
          </p>
        )}
      </ConfirmDialog>
    </AdminShell>
  );
}
