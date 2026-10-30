import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Ban,
  CheckCircle2,
  FileText,
  Flag,
  FolderKanban,
  MessageSquare,
  RefreshCw,
  UserRound,
  Users,
} from "lucide-react";

import AdminShell from "../../components/admin/AdminShell";
import { PageHeader, SectionPanel, StatCard } from "../../components/admin/PageHeader";
import { LineChart } from "../../components/admin/Charts";
import StatusBadge from "../../components/admin/StatusBadge";
import { useAdminToast } from "../../components/admin/ToastProvider";
import { fetchAdminActivityChart, fetchAdminOverview } from "../../lib/admin";
import {
  actionLabel,
  formatNumber,
  REPORT_REASON_LABELS,
  timeAgo,
} from "../../lib/adminFormat";
import { getMediaUrl } from "../../lib/api";
import Avatar from "../../components/ui/Avatar";

const METRICS = [
  { key: "registrations", label: "Registrations", color: "var(--accent)" },
  { key: "dau", label: "Active users", color: "var(--teal)" },
  { key: "posts", label: "Posts", color: "var(--info)" },
  { key: "ticks", label: "Ticks", color: "var(--warning)" },
];

export default function AdminOverviewPage() {
  const { push } = useAdminToast();
  const [overview, setOverview] = useState(null);
  const [chart, setChart] = useState(null);
  const [days, setDays] = useState(30);
  const [metrics, setMetrics] = useState(["registrations", "dau", "posts"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (range) => {
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      const [summary, activity] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminActivityChart(range),
      ]);
      setOverview(summary);
      setChart(activity);
    } catch (requestError) {
      setError(requestError.message || "Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load(days));
  }, [days, load]);

  const refresh = () => {
    setLoading(true);
    load(days).then(() => push("Dashboard refreshed", "info"));
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

  const totals = overview?.totals || {};
  const series = METRICS.filter((metric) => metrics.includes(metric.key)).map((metric) => ({
    ...metric,
    values: chart?.[metric.key] || [],
  }));

  return (
    <AdminShell>
      <PageHeader
        eyebrow="Control room"
        title="Platform overview"
        description="A live read on TickMe's community, content, and moderation queue."
        actions={
          <div className="admin-toolbar">
            <select className="input admin-select" value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Chart range">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button type="button" className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}>
              <RefreshCw size={15} aria-hidden="true" className={loading ? "is-spinning" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      <div className="admin-stat-grid">
        <StatCard label="Total members" value={loading ? "—" : formatNumber(totals.users)} hint={`${formatNumber(totals.new_users_today)} joined today`} icon={Users} />
        <StatCard label="Active today" value={loading ? "—" : formatNumber(totals.dau)} hint={`${formatNumber(totals.mau)} in the last 30 days`} icon={Activity} tone="accent" />
        <StatCard label="Developers" value={loading ? "—" : formatNumber(totals.developers)} hint="Active developer profiles" icon={UserRound} />
        <StatCard label="Designers" value={loading ? "—" : formatNumber(totals.designers)} hint="Active designer profiles" icon={UserRound} tone="teal" />
        <StatCard label="Posts" value={loading ? "—" : formatNumber(totals.posts)} hint={`${formatNumber(totals.published_posts)} published · ${formatNumber(totals.removed_posts)} removed`} icon={FileText} />
        <StatCard label="Projects" value={loading ? "—" : formatNumber(totals.projects)} hint={`${formatNumber(totals.featured_projects)} featured`} icon={FolderKanban} />
        <StatCard label="Ticks" value={loading ? "—" : formatNumber(totals.ticks)} hint={`${formatNumber(totals.comments)} comments`} icon={CheckCircle2} tone="teal" />
        <StatCard label="Pending reports" value={loading ? "—" : formatNumber(totals.pending_reports)} hint={`${formatNumber(totals.new_reports_today)} opened today`} icon={Flag} tone={totals.pending_reports ? "danger" : "default"} />
        <StatCard label="Suspended" value={loading ? "—" : formatNumber(totals.suspended_users)} hint="Accounts under restriction" icon={Ban} tone={totals.suspended_users ? "danger" : "default"} />
        <StatCard label="Comments" value={loading ? "—" : formatNumber(totals.comments)} hint={`${formatNumber(totals.published_comments)} visible`} icon={MessageSquare} />
      </div>

      <div className="admin-chart-grid">
        <SectionPanel
          title="Community activity"
          description={`Daily engagement across the last ${days} days.`}
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
          {chart ? <LineChart labels={chart.labels} series={series} /> : <div className="admin-chart-skeleton skeleton" />}
        </SectionPanel>

        <SectionPanel title="Platform growth" description="Cumulative registered members.">
          {chart ? (
            <LineChart
              labels={chart.labels}
              series={[{ label: "Members", color: "var(--accent)", values: chart.cumulative_users }]}
              valueFormatter={formatNumber}
            />
          ) : (
            <div className="admin-chart-skeleton skeleton" />
          )}
        </SectionPanel>
      </div>

      <div className="admin-three-col">
        <SectionPanel
          title="Newest members"
          action={<Link className="admin-text-link" to="/admin/users">All members <ArrowRight size={14} aria-hidden="true" /></Link>}
        >
          <ul className="admin-people-list">
            {(overview?.recent_users || []).map((person) => (
              <li key={person.id}>
                <Link to={`/admin/users/${person.id}`}>
                  <Avatar name={person.name || person.username} src={getMediaUrl(person.avatar_url)} size={34} />
                  <span>
                    <strong>{person.name || person.username}</strong>
                    <small>@{person.username} · {timeAgo(person.created_at)}</small>
                  </span>
                  <StatusBadge status={person.account_status} />
                </Link>
              </li>
            ))}
            {!loading && !(overview?.recent_users || []).length && <li className="admin-empty-note">No members yet.</li>}
          </ul>
        </SectionPanel>

        <SectionPanel
          title="Moderation queue"
          action={<Link className="admin-text-link" to="/admin/reports">Open queue <ArrowRight size={14} aria-hidden="true" /></Link>}
        >
          <ul className="admin-queue-list">
            {(overview?.recent_reports || []).map((report) => (
              <li key={report.id}>
                <Link to={`/admin/reports/${report.id}`}>
                  <span className={`admin-queue-list__icon admin-queue-list__icon--${report.status === "pending" ? "warning" : "neutral"}`} aria-hidden="true">
                    <Flag size={14} />
                  </span>
                  <span className="admin-queue-list__copy">
                    <strong>{REPORT_REASON_LABELS[report.reason] || report.reason} · {report.target_type}</strong>
                    <small>{report.reporter ? `@${report.reporter.username}` : "Deleted member"} · {timeAgo(report.created_at)}</small>
                  </span>
                  <StatusBadge status={report.status} />
                </Link>
              </li>
            ))}
            {!loading && !(overview?.recent_reports || []).length && <li className="admin-empty-note">The queue is clear.</li>}
          </ul>
        </SectionPanel>

        <SectionPanel
          title="Admin activity"
          action={<Link className="admin-text-link" to="/admin/activity">Full log <ArrowRight size={14} aria-hidden="true" /></Link>}
        >
          <ul className="admin-timeline">
            {(overview?.recent_activity || []).map((entry) => (
              <li key={entry.id}>
                <span className="admin-timeline__dot" aria-hidden="true" />
                <span>
                  <strong>{actionLabel(entry.action)}</strong>
                  <small>{entry.summary || entry.target_type} · {timeAgo(entry.created_at)}</small>
                </span>
              </li>
            ))}
            {!loading && !(overview?.recent_activity || []).length && <li className="admin-empty-note">No admin actions recorded yet.</li>}
          </ul>
        </SectionPanel>
      </div>
    </AdminShell>
  );
}
