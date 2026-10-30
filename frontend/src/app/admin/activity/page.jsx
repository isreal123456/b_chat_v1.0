import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FilterX, RefreshCw } from "lucide-react";

import AdminShell from "../../../components/admin/AdminShell";
import { PageHeader, SectionPanel } from "../../../components/admin/PageHeader";
import { DataTable, Pagination } from "../../../components/admin/Table";
import { fetchAdminActivity, fetchAdminTeam } from "../../../lib/admin";
import { ACTION_LABELS, ROLE_LABELS, actionLabel, formatDateTime, timeAgo } from "../../../lib/adminFormat";

const PAGE_SIZE = 20;

function detailsText(details) {
  if (!details || !Object.keys(details).length) return "No additional details.";
  return JSON.stringify(details, null, 2);
}

export default function AdminActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filters = useMemo(
    () => ({
      action: searchParams.get("action") || "",
      admin_id: searchParams.get("admin_id") || "",
      target_type: searchParams.get("target_type") || "",
    }),
    [searchParams],
  );
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const updateParams = useCallback(
    (changes, { replace = false } = {}) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(changes).forEach(([key, value]) => {
        if (!value) next.delete(key);
        else next.set(key, value);
      });
      if (changes.page === undefined && Object.keys(changes).some((key) => key !== "page")) next.delete("page");
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      setResult(
        await fetchAdminActivity({
          action: filters.action || undefined,
          admin_id: filters.admin_id || undefined,
          target_type: filters.target_type || undefined,
          page,
          page_size: PAGE_SIZE,
        }),
      );
    } catch (requestError) {
      setError(requestError.message || "Could not load the activity log.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    fetchAdminTeam()
      .then((data) => setTeam(data.items || []))
      .catch(() => setTeam([]));
  }, []);

  const hasFilters = Object.values(filters).some(Boolean);

  const columns = [
    {
      header: "When",
      render: (row) => (
        <div className="admin-cell-copy">
          <span>{formatDateTime(row.created_at)}</span>
          <small>{timeAgo(row.created_at)}</small>
        </div>
      ),
    },
    {
      header: "Administrator",
      render: (row) => (
        <div className="admin-cell-copy">
          <span>@{row.admin?.username || "system"}</span>
          <small>{ROLE_LABELS[row.admin?.role] || row.admin?.role || "System"}</small>
        </div>
      ),
    },
    {
      header: "Action",
      render: (row) => (
        <span className={`admin-badge admin-badge--${row.action.includes("remove") || row.action.includes("suspend") || row.action.includes("delete") ? "danger" : "neutral"}`}>
          {actionLabel(row.action)}
        </span>
      ),
    },
    {
      header: "Resource",
      className: "admin-col-secondary",
      render: (row) => (
        <div className="admin-cell-copy">
          <span>{row.target_type || "—"}</span>
          <small>{row.target_id ? `#${row.target_id}` : "n/a"}</small>
        </div>
      ),
    },
    {
      header: "Summary",
      render: (row) => (
        <div className="admin-cell-copy">
          <span>{row.summary || "—"}</span>
          {row.details && Object.keys(row.details).length > 0 && (
            <details className="admin-log-details">
              <summary>Details</summary>
              <pre>{detailsText(row.details)}</pre>
            </details>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Audit trail"
        title="Activity log"
        description="Every administrative action, captured with the actor, resource, and time."
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
          <label className="admin-field">
            <span>Action</span>
            <select className="input admin-select" value={filters.action} onChange={(event) => updateParams({ action: event.target.value })}>
              <option value="">All actions</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Administrator</span>
            <select className="input admin-select" value={filters.admin_id} onChange={(event) => updateParams({ admin_id: event.target.value })}>
              <option value="">Everyone</option>
              {team.map((person) => (
                <option key={person.id} value={person.id}>
                  @{person.username} · {ROLE_LABELS[person.role] || person.role}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Resource type</span>
            <select className="input admin-select" value={filters.target_type} onChange={(event) => updateParams({ target_type: event.target.value })}>
              <option value="">All resources</option>
              <option value="user">Members</option>
              <option value="post">Posts</option>
              <option value="comment">Comments</option>
              <option value="project">Projects</option>
              <option value="report">Reports</option>
              <option value="settings">Settings</option>
            </select>
          </label>
          {hasFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
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
          empty="No administrative actions recorded yet."
        />

        <Pagination
          page={page}
          pages={result?.pages || 1}
          total={result?.total || 0}
          pageSize={PAGE_SIZE}
          onPageChange={(next) => updateParams({ page: String(next) })}
        />
      </SectionPanel>
    </AdminShell>
  );
}
