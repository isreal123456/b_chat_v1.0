import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FilterX, RefreshCw, Search, ShieldCheck, Undo2 } from "lucide-react";

import AdminShell from "../../../../components/admin/AdminShell";
import { PageHeader, SectionPanel } from "../../../../components/admin/PageHeader";
import { DataTable, Pagination } from "../../../../components/admin/Table";
import StatusBadge from "../../../../components/admin/StatusBadge";
import ConfirmDialog from "../../../../components/admin/ConfirmDialog";
import { useAdminToast } from "../../../../components/admin/ToastProvider";
import {
  fetchAdminComments,
  removeAdminComment,
  restoreAdminComment,
} from "../../../../lib/admin";
import { formatDateTime, formatNumber, truncate } from "../../../../lib/adminFormat";

const PAGE_SIZE = 20;
const FILTER_DEFAULTS = { q: "", status: "", reported: "", author_id: "" };

export default function AdminCommentsPage() {
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
        await fetchAdminComments({
          ...filters,
          reported: filters.reported === "true",
          author_id: filters.author_id || undefined,
          page,
          page_size: PAGE_SIZE,
        }),
      );
    } catch (requestError) {
      setError(requestError.message || "Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      if (target.moderation_status === "removed") {
        await restoreAdminComment(target.id);
        push(`Comment #${target.id} restored`);
      } else {
        await removeAdminComment(target.id, reason.trim());
        push(`Comment #${target.id} removed`);
      }
      setTarget(null);
      setReason("");
      await load();
    } catch (requestError) {
      push(requestError.message || "Could not update this comment.", "error");
    } finally {
      setBusy(false);
    }
  };

  const hasFilters = Object.entries(filters).some(([, value]) => Boolean(value));

  const columns = [
    {
      header: "Comment",
      render: (row) => (
        <div className="admin-cell-copy">
          <span>{truncate(row.content, 110)}</span>
          <small>
            #{row.id} · {formatDateTime(row.created_at)}
          </small>
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
    {
      header: "Post",
      className: "admin-col-secondary",
      render: (row) => (
        <Link className="admin-text-link" to={`/admin/content/posts/${row.post_id}`}>
          Post #{row.post_id}
        </Link>
      ),
    },
    { header: "Status", render: (row) => <StatusBadge status={row.moderation_status} /> },
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
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Moderation"
        title="Comments"
        description="Review replies across the platform. Removals are reversible and audited."
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
            <label htmlFor="admin-comment-search" className="sr-only">Search comments</label>
            <input
              id="admin-comment-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search comment text…"
              autoComplete="off"
            />
          </div>
          <label className="admin-field">
            <span>Visibility</span>
            <select className="input admin-select" value={filters.status} onChange={(event) => updateParams({ status: event.target.value })}>
              <option value="">All comments</option>
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
          empty="No comments match these filters."
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
            ? `Restore comment #${target?.id}?`
            : `Remove comment #${target?.id}?`
        }
        description={
          target?.moderation_status === "removed"
            ? "This comment will be visible again. The restore is recorded in the audit log."
            : "The comment is hidden from members and can be restored later."
        }
        confirmLabel={target?.moderation_status === "removed" ? "Restore comment" : "Remove comment"}
        tone={target?.moderation_status === "removed" ? "primary" : "danger"}
        busy={busy}
        confirmDisabled={target?.moderation_status !== "removed" && reason.trim().length < 3}
        onConfirm={submit}
        onClose={() => !busy && setTarget(null)}
      >
        {target && (
          <p className="admin-dialog-preview">
            {truncate(target.content, 180)} · {target.author ? `@${target.author.username}` : "deleted member"}
          </p>
        )}
        {target?.moderation_status !== "removed" && (
          <label className="admin-field">
            <span>Reason (recorded in the audit log)</span>
            <textarea
              className="textarea"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        )}
      </ConfirmDialog>
    </AdminShell>
  );
}
