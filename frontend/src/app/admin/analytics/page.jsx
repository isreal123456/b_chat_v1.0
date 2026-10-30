import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderKanban,
  RefreshCw,
  Repeat2,
  Users,
} from "lucide-react";

import AdminShell from "../../../components/admin/AdminShell";
import { PageHeader, SectionPanel, StatCard } from "../../../components/admin/PageHeader";
import { DonutChart, LineChart, RankingBars } from "../../../components/admin/Charts";
import { DataTable } from "../../../components/admin/Table";
import StatusBadge from "../../../components/admin/StatusBadge";
import { useAdminToast } from "../../../components/admin/ToastProvider";
import Avatar from "../../../components/ui/Avatar";
import ProjectCover from "../../../components/projects/ProjectCover";
import { fetchAdminAnalytics } from "../../../lib/admin";
import {
  formatDate,
  formatFullNumber,
  formatNumber,
  timeAgo,
  truncate,
} from "../../../lib/adminFormat";
import { getMediaUrl } from "../../../lib/api";

const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "365d", label: "1 year" },
];

const METRICS = [
  { key: "registrations", label: "Registrations", color: "var(--accent)" },
  { key: "posts", label: "Posts", color: "var(--info)" },
  { key: "comments", label: "Comments", color: "var(--teal)" },
  { key: "ticks", label: "Ticks", color: "var(--warning)" },
  { key: "shares", label: "Reposts", color: "#b08cff" },
  { key: "dau", label: "Active users", color: "#ff9f7b" },
];

function periodLabel(range) {
  return RANGES.find((item) => item.value === range)?.label?.toLowerCase() || "30 days";
}

export default function AdminAnalyticsPage() {
  const { push } = useAdminToast();
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState(["registrations", "posts", "dau"]);

  const load = useCallback(async (selectedRange) => {
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      setData(await fetchAdminAnalytics(selectedRange));
    } catch (requestError) {
      setError(requestError.message || "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load(range));
  }, [range, load]);

  const refresh = () => {
    setLoading(true);
    load(range).then(() => push("Analytics refreshed", "info"));
  };

  const toggleMetric = (key) => {
    setMetrics((current) =>
      current.includes(key)
        ? current.length === 1
          ? current
          : current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const totals = data?.totals || {};
  const trends = data?.trends;
  const series = METRICS.filter((metric) => metrics.includes(metric.key)).map((metric) => ({
    ...metric,
    values: trends?.[metric.key] || [],
  }));

  const activeColumns = [
    {
      header: "Member",
      render: (row) => (
        <div className="admin-person">
          <Avatar
            name={row.user?.name || row.user?.username || "Member"}
            src={row.user?.avatar_url ? getMediaUrl(row.user.avatar_url) : ""}
            size={32}
          />
          <span>
            <strong>{row.user?.name || row.user?.username}</strong>
            <small>@{row.user?.username}</small>
          </span>
        </div>
      ),
    },
    {
      header: "Activity score",
      render: (row) => <span className="admin-mono">{formatFullNumber(row.score)}</span>,
    },
    { header: "Posts", render: (row) => formatNumber(row.posts) },
    { header: "Ticks", render: (row) => formatNumber(row.ticks) },
    { header: "Comments", render: (row) => formatNumber(row.comments) },
    {
      header: "",
      className: "admin-cell--end",
      render: (row) =>
        row.user ? (
          <Link className="admin-text-link" to={`/admin/users/${row.user.id}`}>
            View <ArrowRight size={13} aria-hidden="true" />
          </Link>
        ) : null,
    },
  ];

  const postColumns = [
    {
      header: "Post",
      render: (row) => (
        <div className="admin-cell-copy">
          <Link className="admin-cell-copy__title" to={`/admin/content/posts/${row.id}`}>
            {truncate(row.content || "(media only)", 90)}
          </Link>
          <small>
            {row.author ? `@${row.author.username}` : "Deleted member"} · {timeAgo(row.created_at)}
          </small>
        </div>
      ),
    },
    { header: "Ticks", render: (row) => <span className="admin-mono">{formatNumber(row.tick_count)}</span> },
  ];

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Insights"
        title="Platform analytics"
        description="Growth, engagement, and community health drawn straight from your database."
        actions={
          <div className="admin-toolbar">
            <div className="admin-segmented" role="group" aria-label="Analytics range">
              {RANGES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={range === item.value ? "is-active" : ""}
                  onClick={() => setRange(item.value)}
                  aria-pressed={range === item.value}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}>
              <RefreshCw size={15} aria-hidden="true" className={loading ? "is-spinning" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      <div className="admin-stat-grid admin-stat-grid--wide">
        <StatCard
          label={`New members · ${periodLabel(range)}`}
          value={loading ? "—" : formatNumber(totals.new_users)}
          hint={`${formatNumber(data?.interval_totals?.daily?.new_users)} today`}
          icon={Users}
          tone="accent"
        />
        <StatCard
          label="Active members"
          value={loading ? "—" : formatNumber(totals.active_users)}
          hint={`${formatNumber(data?.interval_totals?.daily?.active_users)} active today`}
          icon={Activity}
          tone="teal"
        />
        <StatCard
          label="Posts created"
          value={loading ? "—" : formatNumber(totals.posts)}
          hint={`${formatNumber(totals.avg_posts_per_active_user)} per active member`}
          icon={FileText}
        />
        <StatCard
          label="Ticks given"
          value={loading ? "—" : formatNumber(totals.ticks)}
          hint={`${formatNumber(totals.comments)} comments`}
          icon={CheckCircle2}
          tone="teal"
        />
        <StatCard
          label="Reposts"
          value={loading ? "—" : formatNumber(totals.shares)}
          hint={`${formatNumber(totals.engagement_rate)} actions per post`}
          icon={Repeat2}
        />
        <StatCard
          label="New projects"
          value={loading ? "—" : formatNumber(totals.projects)}
          hint="Published in this window"
          icon={FolderKanban}
        />
      </div>

      <div className="admin-chart-grid">
        <SectionPanel
          title="Engagement trend"
          description="Daily activity for the selected window."
          action={
            <div className="admin-metric-toggles" role="group" aria-label="Chart metrics">
              {METRICS.map((metric) => (
                <button
                  key={metric.key}
                  type="button"
                  className={`admin-chip${metrics.includes(metric.key) ? " is-active" : ""}`}
                  onClick={() => toggleMetric(metric.key)}
                  aria-pressed={metrics.includes(metric.key)}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          }
        >
          {trends ? (
            <LineChart labels={trends.labels} series={series} height={286} />
          ) : (
            <div className="admin-chart-skeleton skeleton" />
          )}
        </SectionPanel>

        <SectionPanel title="Member mix" description="Active accounts by discipline.">
          {data ? (
            <DonutChart data={data.category_split} centerLabel="Active" colors={["var(--accent)", "var(--teal)", "var(--info)"]} />
          ) : (
            <div className="admin-chart-skeleton skeleton" />
          )}
        </SectionPanel>
      </div>

      <div className="admin-two-col">
        <SectionPanel title="Activity windows" description="Rolling totals across the platform.">
          <div className="admin-table-wrap admin-table-wrap--stack">
            <table className="admin-table admin-table--compact admin-table--stack">
              <thead>
                <tr>
                  <th scope="col">Window</th>
                  <th scope="col">Active members</th>
                  <th scope="col">New members</th>
                  <th scope="col">Posts</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Today", "daily"],
                  ["Last 7 days", "weekly"],
                  ["Last 30 days", "monthly"],
                ].map(([label, key]) => (
                  <tr key={key}>
                    <td data-label="Window">{label}</td>
                    <td className="admin-mono" data-label="Active members">{formatNumber(data?.interval_totals?.[key]?.active_users)}</td>
                    <td className="admin-mono" data-label="New members">{formatNumber(data?.interval_totals?.[key]?.new_users)}</td>
                    <td className="admin-mono" data-label="Posts">{formatNumber(data?.interval_totals?.[key]?.posts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>

        <SectionPanel title="Popular technologies" description="Top skills and project stacks.">
          {data ? (
            <RankingBars
              items={(data.technologies || []).map((item) => ({ label: item.name, value: item.count }))}
              valueLabel="mentions"
            />
          ) : (
            <div className="admin-chart-skeleton skeleton" />
          )}
        </SectionPanel>
      </div>

      <SectionPanel
        title="Most active members"
        description="Ranked by posts, ticks, comments, and reposts in this window."
      >
        <DataTable columns={activeColumns} rows={data?.most_active_users || []} loading={loading} empty="No activity in this window yet." />
      </SectionPanel>

      <div className="admin-two-col">
        <SectionPanel
          title="Most ticked posts"
          description={`Top posts by Ticks in the last ${periodLabel(range)}.`}
          action={<Link className="admin-text-link" to="/admin/content/posts">All posts <ArrowRight size={13} aria-hidden="true" /></Link>}
        >
          <DataTable columns={postColumns} rows={data?.most_ticked_posts || []} loading={loading} empty="No posts in this window." />
        </SectionPanel>

        <SectionPanel
          title="Popular projects"
          description="Ranked by project posts and accepted collaborators."
          action={<Link className="admin-text-link" to="/admin/projects">All projects <ArrowRight size={13} aria-hidden="true" /></Link>}
        >
          <ul className="admin-project-list">
            {(data?.popular_projects || []).map((project) => (
              <li key={project.id}>
                <Link to={`/admin/projects/${project.id}`}>
                  <ProjectCover project={project} className="admin-project-list__cover" />
                  <span className="admin-project-list__copy">
                    <strong>{project.title}</strong>
                    <small>
                      {project.owner ? `@${project.owner.username}` : "Deleted owner"} · {formatNumber(project.post_count)} posts ·{" "}
                      {formatNumber(project.collaborator_count)} collaborators
                    </small>
                  </span>
                  <StatusBadge status={project.moderation_status} />
                </Link>
              </li>
            ))}
            {!loading && !(data?.popular_projects || []).length && <li className="admin-empty-note">No published projects yet.</li>}
          </ul>
        </SectionPanel>
      </div>

      <p className="admin-footnote">
        All figures are computed live from TickMe data. Window ends {formatDate(new Date())} ·{" "}
        {data ? `${data.days} days` : "—"}
      </p>
    </AdminShell>
  );
}
