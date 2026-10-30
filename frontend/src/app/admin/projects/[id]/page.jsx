import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  Handshake,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  StarOff,
  Undo2,
  Users,
} from "lucide-react";

import AdminShell from "../../../../components/admin/AdminShell";
import { PageHeader, SectionPanel, StatCard } from "../../../../components/admin/PageHeader";
import { DataTable } from "../../../../components/admin/Table";
import StatusBadge from "../../../../components/admin/StatusBadge";
import ConfirmDialog from "../../../../components/admin/ConfirmDialog";
import { useAdminToast } from "../../../../components/admin/ToastProvider";
import ProjectCover from "../../../../components/projects/ProjectCover";
import {
  featureAdminProject,
  fetchAdminProject,
  hasAdminPermission,
  removeAdminProject,
  restoreAdminProject,
} from "../../../../lib/admin";
import {
  REPORT_REASON_LABELS,
  formatDate,
  formatDateTime,
  formatNumber,
  timeAgo,
  truncate,
} from "../../../../lib/adminFormat";
import { useAuth } from "../../../../providers/AuthProvider";

function collabTone(status) {
  if (status === "accepted") return "success";
  if (status === "pending") return "warning";
  if (status === "rejected") return "danger";
  return "neutral";
}

export default function AdminProjectDetailPage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { push } = useAdminToast();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const canModerate = hasAdminPermission(me, "projects.moderate");
  const canFeature = hasAdminPermission(me, "projects.feature");

  const load = useCallback(async () => {
    await Promise.resolve();
    setError("");
    try {
      setProject(await fetchAdminProject(id));
    } catch (requestError) {
      setError(requestError.message || "Could not load this project.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const refresh = () => {
    setLoading(true);
    load().then(() => push("Project refreshed", "info"));
  };

  const toggleFeatured = async () => {
    setBusy(true);
    try {
      await featureAdminProject(project.id, !project.featured);
      push(project.featured ? "Project removed from featured" : "Project featured");
      await load();
    } catch (requestError) {
      push(requestError.message || "Could not update the featured state.", "error");
    } finally {
      setBusy(false);
    }
  };

  const submitModeration = async () => {
    setBusy(true);
    try {
      if (project.moderation_status === "removed") {
        await restoreAdminProject(project.id);
        push(`“${project.title}” restored`);
      } else {
        await removeAdminProject(project.id, reason.trim());
        push(`“${project.title}” removed`);
      }
      setDialogOpen(false);
      setReason("");
      await load();
    } catch (requestError) {
      push(requestError.message || "Could not update this project.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !project) {
    return (
      <AdminShell>
        <div className="admin-inline-state" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Loading project…</span>
        </div>
      </AdminShell>
    );
  }

  if (!project) {
    return (
      <AdminShell>
        <PageHeader eyebrow="Showcase" title="Project not found" />
        {error && <div className="alert alert--error" role="alert">{error}</div>}
        <Link className="btn btn-secondary" to="/admin/projects">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to projects
        </Link>
      </AdminShell>
    );
  }

  const requestColumns = [
    {
      header: "Requester",
      render: (row) =>
        row.requester ? (
          <div className="admin-cell-copy">
            <Link className="admin-cell-copy__title" to={`/admin/users/${row.requester.id}`}>
              {row.requester.name}
            </Link>
            <small>@{row.requester.username} · {timeAgo(row.created_at)}</small>
          </div>
        ) : (
          <span className="admin-muted">Deleted member</span>
        ),
    },
    { header: "Role", render: (row) => row.role || "—" },
    {
      header: "Message",
      render: (row) => <span className="admin-muted">{truncate(row.message || "—", 90)}</span>,
    },
    {
      header: "Status",
      render: (row) => (
        <span className={`admin-badge admin-badge--${collabTone(row.status)}`}>{row.status}</span>
      ),
    },
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
    { header: "Details", render: (row) => <span className="admin-muted">{truncate(row.details || "—", 80)}</span> },
  ];

  return (
    <AdminShell>
      <Link className="admin-back" to="/admin/projects">
        <ArrowLeft size={15} aria-hidden="true" />
        All projects
      </Link>

      <PageHeader
        eyebrow="Showcase project"
        title={project.title}
        description={`Owned by ${project.owner ? `@${project.owner.username}` : "a deleted member"} · created ${formatDate(project.created_at)}`}
        actions={
          <div className="admin-toolbar">
            <StatusBadge status={project.moderation_status} />
            {project.featured && <span className="admin-badge admin-badge--accent">Featured</span>}
            <button type="button" className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}>
              <RefreshCw size={15} aria-hidden="true" className={loading ? "is-spinning" : ""} />
              Refresh
            </button>
            {canFeature && project.moderation_status === "published" && (
              <button type="button" className="btn btn-outline btn-sm" onClick={toggleFeatured} disabled={busy}>
                {project.featured ? <StarOff size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                {project.featured ? "Unfeature" : "Feature"}
              </button>
            )}
            {canModerate && (
              <button
                type="button"
                className={`btn btn-sm ${project.moderation_status === "removed" ? "btn-primary" : "btn-danger"}`}
                onClick={() => setDialogOpen(true)}
              >
                {project.moderation_status === "removed" ? (
                  <>
                    <Undo2 size={15} aria-hidden="true" /> Restore
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} aria-hidden="true" /> Remove
                  </>
                )}
              </button>
            )}
          </div>
        }
      />

      {error && <div className="alert alert--error" role="alert">{error}</div>}

      {project.moderation_status === "removed" && (
        <div className="alert alert--warning" role="status">
          <div>
            <strong>This project is removed.</strong>
            <p>
              {project.removal_reason || "No reason captured."} · removed {timeAgo(project.removed_at)}
            </p>
          </div>
        </div>
      )}

      <div className="admin-project-hero card">
        <ProjectCover project={project} className="admin-project-hero__cover" />
        <div className="admin-project-hero__body">
          <p className="admin-eyebrow">{project.category || "Project"}</p>
          <h2>{project.title}</h2>
          {project.tagline && <p className="admin-project-hero__tagline">{project.tagline}</p>}
          <div className="admin-chip-row">
            {(project.tech_stack || []).map((tech) => (
              <span key={tech} className="admin-chip admin-chip--static">{tech}</span>
            ))}
            {!(project.tech_stack || []).length && <span className="admin-muted">No technologies listed.</span>}
          </div>
          <div className="admin-project-hero__links">
            <Link className="btn btn-outline btn-sm" to={`/projects/${project.id}`}>
              <ExternalLink size={14} aria-hidden="true" />
              Public page
            </Link>
            {project.repo_url && (
              <a className="btn btn-outline btn-sm" href={project.repo_url} target="_blank" rel="noreferrer">
                <GitBranch size={14} aria-hidden="true" />
                Repository
              </a>
            )}
            {project.live_url && (
              <a className="btn btn-outline btn-sm" href={project.live_url} target="_blank" rel="noreferrer">
                <ExternalLink size={14} aria-hidden="true" />
                Live site
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="admin-stat-grid admin-stat-grid--wide">
        <StatCard label="Collaborators" value={formatNumber(project.collaborator_count)} icon={Users} tone="teal" />
        <StatCard label="Pending requests" value={formatNumber(project.pending_collaboration_count)} icon={Handshake} />
        <StatCard label="Project posts" value={formatNumber(project.post_count)} icon={GitBranch} />
        <StatCard
          label="Reports"
          value={formatNumber(project.report_count)}
          icon={ShieldCheck}
          tone={project.report_count ? "danger" : "default"}
        />
      </div>

      <SectionPanel title="About this project">
        <p className="admin-post-body">{project.description || <span className="admin-muted">No description provided.</span>}</p>
        <dl className="admin-detail-list admin-detail-list--inline">
          <div>
            <dt>Owner</dt>
            <dd>
              {project.owner ? (
                <Link className="admin-text-link" to={`/admin/users/${project.owner.id}`}>
                  @{project.owner.username}
                </Link>
              ) : (
                "Deleted member"
              )}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{project.status || "—"}</dd>
          </div>
          <div>
            <dt>Looking for collaborators</dt>
            <dd>{project.looking_for_collaborators ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatDateTime(project.updated_at)}</dd>
          </div>
          {project.featured_at && (
            <div>
              <dt>Featured since</dt>
              <dd>{formatDateTime(project.featured_at)}</dd>
            </div>
          )}
        </dl>
      </SectionPanel>

      <SectionPanel
        title="Collaboration requests"
        description={`${formatNumber(project.pending_collaboration_count)} pending · ${formatNumber(project.collaborator_count)} accepted`}
      >
        <DataTable
          columns={requestColumns}
          rows={project.collaboration_requests || []}
          empty="No collaboration requests yet."
        />
      </SectionPanel>

      <SectionPanel title="Reports on this project" description={`${project.reports?.length || 0} total`}>
        <DataTable columns={reportColumns} rows={project.reports || []} empty="No reports on this project." />
      </SectionPanel>

      <ConfirmDialog
        open={dialogOpen}
        title={project.moderation_status === "removed" ? `Restore “${project.title}”?` : `Remove “${project.title}”?`}
        description={
          project.moderation_status === "removed"
            ? "The project returns to the showcase. The restore is recorded in the audit log."
            : "The project is hidden from members and removed from featured. It can be restored later."
        }
        confirmLabel={project.moderation_status === "removed" ? "Restore project" : "Remove project"}
        tone={project.moderation_status === "removed" ? "primary" : "danger"}
        busy={busy}
        confirmDisabled={project.moderation_status !== "removed" && reason.trim().length < 3}
        onConfirm={submitModeration}
        onClose={() => !busy && setDialogOpen(false)}
      >
        {project.moderation_status !== "removed" && (
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
