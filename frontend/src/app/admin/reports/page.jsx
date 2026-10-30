import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FilterX, Flag, RefreshCw, Search } from "lucide-react";

import AdminShell from "../../../components/admin/AdminShell";
import { PageHeader, SectionPanel } from "../../../components/admin/PageHeader";
import { DataTable, Pagination } from "../../../components/admin/Table";
import StatusBadge from "../../../components/admin/StatusBadge";
import { fetchAdminReports } from "../../../lib/admin";
import { REPORT_REASON_LABELS, formatNumber, timeAgo, truncate } from "../../../lib/adminFormat";

const PAGE_SIZE = 20;
const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

export default function AdminReportsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(searchParams.get("q") || "");

  const filters = useMemo(
    () => ({
      status: searchParams.get("status") || "",
      target_type: searchParams.get("target_type") || "",
      reason: searchParams.get("reason") || "",
      q: searchParams.get("q") || "",
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
      setResult(await fetchAdminReports({ ...filters, page, page_size: PAGE_SIZE }));
    } catch (requestError) {
      setError(requestError.message || "Could not load reports.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const counts = result?.counts || {};
  const hasFilters = Boolean(filters.target_type || filters.reason || filters.q);

  const columns = [
    {
      header: "Report",
      render: (row) => (
        <div className="admin-cell-copy">
          <span className="admin-cell-copy__title">
            {REPORT_REASON_LABELS[row.reason] || row.reason}
            <span className="admin-type-tag">{row.target_type}</span>
          </span>
          <small>#{row.id} · {timeAgo(row.created_at)}</small>
        </div>
      ),
    },
    {
      header: "Reported",
      render: (row) => (
        <div className="admin-cell-copy">
          <span>
            {row.target_type === "user"
              ? row.target?.title || `User #${row.target_id}`
              : truncate(row.target?.content || row.target?.title || `#${row.target_id}`, 70)}
          </span>
          <small>
            {row.target?.author ? `@${row.target.author.username}` : row.target?.available === false ? "Content deleted" : "—"}
          </small>
        </div>
      ),
    },
    {
      header: "Reporter",
      className: "admin-col-secondary",
      render: (row) => (row.reporter ? `@${row.reporter.username}` : <span className="admin-muted">Deleted member</span>),
    },
    { header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      header: "",
      className: "admin-cell--end",
      render: () => <span className="admin-text-link">Review →</span>,
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Trust & safety"
        title="Reports"
        description="Investigate member reports, record decisions, and keep the community safe."
        actions={
          <div className="admin-toolbar">
            <span className="admin-count-pill">
              <Flag size={15} aria-hidden="true" />
              {formatNumber(result?.open || 0)} open
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
              <RefreshCw size={15} aria-hidden="true" className={loading ? "is-spinning" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      <div className="admin-tabs" role="tablist" aria-label="Report status">
        {STATUS_TABS.map((tab) => {
          const count = tab.value ? counts[tab.value] : result?.total;
          return (
            <button
              key={tab.value || "all"}
              type="button"
              role="tab"
              aria-selected={filters.status === tab.value}
              className={`admin-tab${filters.status === tab.value ? " is-active" : ""}`}
              onClick={() => updateParams({ status: tab.value })}
            >
              {tab.label}
              {count !== undefined && count !== null && <span className="admin-tab__count">{formatNumber(count)}</span>}
            </button>
          );
        })}
      </div>

      <SectionPanel>
        <div className="admin-filterbar">
          <div className="admin-search">
            <Search size={16} aria-hidden="true" />
            <label htmlFor="admin-report-search" className="sr-only">Search reports</label>
            <input
              id="admin-report-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search details, content, or members…"
              autoComplete="off"
            />
          </div>
          <label className="admin-field">
            <span>Target</span>
            <select className="input admin-select" value={filters.target_type} onChange={(event) => updateParams({ target_type: event.target.value })}>
              <option value="">All targets</option>
              <option value="user">Members</option>
              <option value="post">Posts</option>
              <option value="comment">Comments</option>
              <option value="project">Projects</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Reason</span>
            <select className="input admin-select" value={filters.reason} onChange={(event) => updateParams({ reason: event.target.value })}>
              <option value="">All reasons</option>
              {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {hasFilters && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch("");
                updateParams({ target_type: "", reason: "", q: "" });
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
          empty="No reports match these filters."
          onRowClick={(row) => navigate(`/admin/reports/${row.id}`)}
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
