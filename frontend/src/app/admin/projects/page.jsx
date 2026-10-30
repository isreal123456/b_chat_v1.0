import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FilterX, RefreshCw, Search, Sparkles, StarOff, ShieldCheck, Undo2 } from "lucide-react";

import AdminShell from "../../../components/admin/AdminShell";
import { PageHeader, SectionPanel } from "../../../components/admin/PageHeader";
import { DataTable, Pagination } from "../../../components/admin/Table";
import StatusBadge from "../../../components/admin/StatusBadge";
import ConfirmDialog from "../../../components/admin/ConfirmDialog";
import { useAdminToast } from "../../../components/admin/ToastProvider";
import ProjectCover from "../../../components/projects/ProjectCover";
import {
  featureAdminProject,
  fetchAdminProjects,
  hasAdminPermission,
  removeAdminProject,
  restoreAdminProject,
} from "../../../lib/admin";
import { formatDate, formatNumber, timeAgo, truncate } from "../../../lib/adminFormat";
import { useAuth } from "../../../providers/AuthProvider";

const PAGE_SIZE = 20;
const FILTER_DEFAULTS = { q: "", status: "", featured: "", reported: "", owner_id: "" };

export default function AdminProjectsPage() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const { push } = useAdminToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [featureBusy, setFeatureBusy] = useState(null);

  const canModerate = hasAdminPermission(me, "projects.moderate");
  const canFeature = hasAdminPermission(me, "projects.feature");

  const filters = useMemo(
    () => ({
      q: searchParams.get("q") || "",
      status: searchParams.get("status") || "",
      featured: searchParams.get("featured") === "true" ? "true" : searchParams.get("featured") === "false" ? "false" : "",
      reported: searchParams.get("reported") ? "true" : "",
      owner_id: searchParams.get("owner_id") || "",
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
      if (filters.q === search.trim()) return;
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
        await fetchAdminProjects({
          ...filters,
          featured: filters.featured === "" ? undefined : filters.featured === "true",
          reported: filters.reported === "true",
          owner_id: filters.owner_id || undefined,
          page,
          page_size: PAGE_SIZE,
        }),
      );
    } catch (requestError) {
      setError(requestError.message || "Could not load projects.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const toggleFeatured = async (project) => {
    setFeatureBusy(project.id);
    try {
      await featureAdminProject(project.id, !project.featured);
      push(project.featured ? `“${project.title}” unfeatured` : `“${project.title}” featured`);
      await load();
    } catch (requestError) {
      push(requestError.message || "Could not update the featured state.", "error");
    } finally {
      setFeatureBusy(null);
    }
  };

  const submitModeration = async () => {
    if (!target) return;
    setBusy(true);
    try {
      if (target.moderation_status === "removed") {
        await restoreAdminProject(target.id);
        push(`“${target.title}” restored`);
      } else {
        await removeAdminProject(target.id, reason.trim());
        push(`“${target.title}” removed`);
      }
      setTarget(null);
      setReason("");
      await load();
    } catch (requestError) {
      push(requestError.message || "Could not update this project.", "error");
    } finally {
      setBusy(false);
    }
  };

  const hasFilters = Object.entries(filters).some(([key, value]) => key !== "featured" && Boolean(value));

  const columns = [
    {
      header: "Project",
      render: (row) => (
        <div className="admin-project-cell">
          <ProjectCover project={row} className="admin-project-cell__cover" />
          <span>
            <strong>{row.title}</strong>
            <small>{truncate(row.tagline || row.category || "No tagline", 64)}</small>
          </span>
        </div>
      ),
    },
    {
      header: "Owner",
      render: (row) => (row.owner ? `@${row.owner.username}` : <span className="admin-muted">Deleted owner</span>),
    },
    { header: "Status", render: (row) => <StatusBadge status={row.moderation_status} /> },
    {
      header: "Featured",
      className: "admin-col-secondary",
      render: (row) =>
        row.featured ? (
          <span className="admin-badge admin-badge--accent">Featured</span>
        ) : (
          <span className="admin-muted">—</span>
        ),
    },
    {
      header: "Collaborators",
      className: "admin-col-secondary",
      render: (row) => (
        <div className="admin-cell-copy">
          <span>{formatNumber(row.collaborator_count)} accepted</span>
          <small>{row.pending_collaboration_count ? `${formatNumber(row.pending_collaboration_count)} pending` : "No pending requests"}</small>
        </div>
      ),
    },
    { header: "Posts", className: "admin-col-secondary", render: (row) => <span className="admin-mono">{formatNumber(row.post_count)}</span> },
    {
      header: "Reports",
      className: "admin-col-secondary",
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
          {canFeature && row.moderation_status === "published" && (
            <button
              type="button"
              className="btn-icon btn-icon--outline"
              title={row.featured ? "Remove from featured" : "Feature this project"}
              aria-label={row.featured ? "Remove from featured" : "Feature this project"}
              onClick={() => toggleFeatured(row)}
              disabled={featureBusy === row.id}
            >
              {row.featured ? <StarOff size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
            </button>
          )}
          {canModerate && (
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
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Showcase"
        title="Projects"
        description="Review the showcase, feature the best work, and monitor collaboration."
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
            <label htmlFor="admin-project-search" className="sr-only">Search projects</label>
            <input
              id="admin-project-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or tagline…"
              autoComplete="off"
            />
          </div>
          <label className="admin-field">
            <span>Status</span>
            <select className="input admin-select" value={filters.status} onChange={(event) => updateParams({ status: event.target.value })}>
              <option value="">All projects</option>
              <option value="published">Published</option>
              <option value="removed">Removed</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Featured</span>
            <select className="input admin-select" value={filters.featured} onChange={(event) => updateParams({ featured: event.target.value })}>
              <option value="">Any</option>
              <option value="true">Featured only</option>
              <option value="false">Not featured</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Reports</span>
            <select className="input admin-select" value={filters.reported} onChange={(event) => updateParams({ reported: event.target.value })}>
              <option value="">Any</option>
              <option value="true">Has open reports</option>
            </select>
          </label>
          {filters.owner_id && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateParams({ owner_id: "" })}>
              Owner #{filters.owner_id} ×
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
          empty="No projects match these filters."
          onRowClick={(row) => navigate(`/admin/projects/${row.id}`)}
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
            ? `Restore “${target?.title}”?`
            : `Remove “${target?.title}”?`
        }
        description={
          target?.moderation_status === "removed"
            ? "The project returns to the showcase. The restore is recorded in the audit log."
            : "The project is hidden from members and removed from featured. It can be restored later."
        }
        confirmLabel={target?.moderation_status === "removed" ? "Restore project" : "Remove project"}
        tone={target?.moderation_status === "removed" ? "primary" : "danger"}
        busy={busy}
        confirmDisabled={target?.moderation_status !== "removed" && reason.trim().length < 3}
        onConfirm={submitModeration}
        onClose={() => !busy && setTarget(null)}
      >
        {target && (
          <p className="admin-dialog-preview">
            {target.title} · {target.owner ? `@${target.owner.username}` : "deleted owner"} · created {formatDate(target.created_at)} · last updated {timeAgo(target.updated_at)}
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
