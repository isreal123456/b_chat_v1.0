import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FilterX, Search, UserPlus } from "lucide-react";

import AdminShell from "../../../components/admin/AdminShell";
import { PageHeader, SectionPanel } from "../../../components/admin/PageHeader";
import { DataTable, Pagination } from "../../../components/admin/Table";
import StatusBadge from "../../../components/admin/StatusBadge";
import Avatar from "../../../components/ui/Avatar";
import { fetchAdminUsers } from "../../../lib/admin";
import { ROLE_LABELS, formatDate, formatNumber, timeAgo } from "../../../lib/adminFormat";
import { getMediaUrl } from "../../../lib/api";

const FILTER_DEFAULTS = { q: "", role: "", status: "", category: "", sort: "newest" };
const PAGE_SIZE = 20;

function roleTone(role) {
  if (role === "super_admin") return "accent";
  if (role === "admin") return "info";
  if (role === "moderator") return "teal";
  return "neutral";
}

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(searchParams.get("q") || "");

  const filters = useMemo(
    () => ({
      q: searchParams.get("q") || "",
      role: searchParams.get("role") || "",
      status: searchParams.get("status") || "",
      category: searchParams.get("category") || "",
      sort: searchParams.get("sort") || "newest",
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
      setResult(await fetchAdminUsers({ ...filters, page, page_size: PAGE_SIZE }));
    } catch (requestError) {
      setError(requestError.message || "Could not load members.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const hasFilters = Object.entries(filters).some(
    ([key, value]) => key !== "sort" && Boolean(value),
  );

  const columns = [
    {
      header: "Member",
      render: (row) => (
        <div className="admin-person">
          <Avatar
            name={row.name || row.username}
            src={row.avatar_url ? getMediaUrl(row.avatar_url) : ""}
            size={36}
          />
          <span>
            <strong>{row.name || row.username}</strong>
            <small>
              @{row.username} · {row.email}
            </small>
          </span>
        </div>
      ),
    },
    {
      header: "Role",
      render: (row) => (
        <span className={`admin-badge admin-badge--${roleTone(row.role)}`}>{ROLE_LABELS[row.role] || row.role}</span>
      ),
    },
    {
      header: "Discipline",
      className: "admin-col-secondary",
      render: (row) => <span className="admin-capitalize">{row.category || "—"}</span>,
    },
    { header: "Status", render: (row) => <StatusBadge status={row.account_status} /> },
    {
      header: "Posts",
      render: (row) => <span className="admin-mono">{formatNumber(row.post_count)}</span>,
    },
    {
      header: "Followers",
      className: "admin-col-secondary",
      render: (row) => <span className="admin-mono">{formatNumber(row.follower_count)}</span>,
    },
    {
      header: "Open reports",
      render: (row) =>
        row.open_report_count ? (
          <span className="admin-badge admin-badge--danger">{formatNumber(row.open_report_count)}</span>
        ) : (
          <span className="admin-muted">—</span>
        ),
    },
    {
      header: "Joined",
      render: (row) => (
        <div className="admin-cell-copy">
          <span>{formatDate(row.created_at)}</span>
          <small>{timeAgo(row.last_active_at)}</small>
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Community"
        title="Members"
        description="Search, review, and manage every TickMe account."
        actions={
          <span className="admin-count-pill">
            <UserPlus size={15} aria-hidden="true" />
            {formatNumber(result?.total || 0)} members
          </span>
        }
      />

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      <SectionPanel>
        <div className="admin-filterbar">
          <div className="admin-search">
            <Search size={16} aria-hidden="true" />
            <label htmlFor="admin-user-search" className="sr-only">Search members</label>
            <input
              id="admin-user-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search username, name, or email…"
              autoComplete="off"
            />
          </div>
          <label className="admin-field">
            <span>Role</span>
            <select className="input admin-select" value={filters.role} onChange={(event) => updateParams({ role: event.target.value })}>
              <option value="">All roles</option>
              <option value="user">Members</option>
              <option value="moderator">Moderators</option>
              <option value="admin">Admins</option>
              <option value="super_admin">Super Admins</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Status</span>
            <select className="input admin-select" value={filters.status} onChange={(event) => updateParams({ status: event.target.value })}>
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Discipline</span>
            <select className="input admin-select" value={filters.category} onChange={(event) => updateParams({ category: event.target.value })}>
              <option value="">Everyone</option>
              <option value="developer">Developers</option>
              <option value="designer">Designers</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Sort</span>
            <select className="input admin-select" value={filters.sort} onChange={(event) => updateParams({ sort: event.target.value })}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="username">Username A–Z</option>
              <option value="activity">Recently active</option>
            </select>
          </label>
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
          empty="No members match these filters."
          onRowClick={(row) => navigate(`/admin/users/${row.id}`)}
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
