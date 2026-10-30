import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ExternalLink, Flag, GitBranch, Pencil, Send, Trash2, Users } from "lucide-react";

import AppShell from "../../../components/layout/AppShell";
import Avatar from "../../../components/ui/Avatar";
import CollaborationSection from "../../../components/projects/CollaborationSection";
import ProjectCover from "../../../components/projects/ProjectCover";
import ReportDialog from "../../../components/reports/ReportDialog";
import { deleteProject, fetchProject, getMediaUrl } from "../../../lib/api";
import { formatMonthYear, statusLabel } from "../../../lib/projects";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetchProject(id)
      .then((data) => {
        if (active) setProject(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load this project.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const refreshProject = () => {
    fetchProject(id)
      .then(setProject)
      .catch((requestError) => setError(requestError.message || "Could not refresh this project."));
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(true);
    setError("");
    try {
      await deleteProject(project.id);
      navigate("/projects", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Could not delete the project.");
      setDeleting(false);
    }
  };

  if (loading || (project && String(project.id) !== String(id))) {
    return (
      <AppShell title="Project">
        <div className="stack" style={{ gap: "1rem" }}>
          <div className="card skeleton" style={{ height: 280 }} />
          <div className="card skeleton" style={{ height: 180 }} />
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title="Project">
        <div className="empty-state">
          <h3>Project not found</h3>
          <p>{error || "It may have been removed by its owner."}</p>
          <Link className="btn btn-secondary btn-sm" to="/projects">Browse projects</Link>
        </div>
      </AppShell>
    );
  }

  const tech = Array.isArray(project.tech_stack) ? project.tech_stack : [];
  const owner = project.owner || {};

  return (
    <AppShell title={project.title} subtitle={`by @${owner.username}`}>
      <div className="page-enter project-detail">
        <Link className="back-link" to="/projects">
          <ArrowLeft size={15} aria-hidden="true" />
          All projects
        </Link>

        <article className="card project-detail__hero">
          <ProjectCover project={project} className="project-detail__cover" />
          <div className="project-detail__body">
            <div className="project-detail__badges">
              <span className={`badge ${project.status === "shipped" ? "badge--accent" : "badge--neutral"}`}>
                {statusLabel(project.status)}
              </span>
              {project.category && <span className="badge badge--neutral">{project.category === "developer" ? "Developer" : "Designer"}</span>}
              {project.looking_for_collaborators && (
                <span className="badge badge--outline">
                  <Users size={11} aria-hidden="true" />
                  Open to collaborators
                </span>
              )}
              {project.collaborator_count > 0 && (
                <span className="badge badge--neutral">
                  <Users size={11} aria-hidden="true" />
                  {project.collaborator_count} {project.collaborator_count === 1 ? "collaborator" : "collaborators"}
                </span>
              )}
            </div>

            <h1 className="project-detail__title">{project.title}</h1>
            {project.tagline && <p className="project-detail__tagline">{project.tagline}</p>}

            <div className="project-detail__owner">
              <Link to={`/profile/${owner.username}`} className="row" style={{ gap: "0.55rem" }}>
                <Avatar
                  name={owner.name || owner.username}
                  src={owner.avatar_url ? getMediaUrl(owner.avatar_url) : ""}
                  size={38}
                />
                <span>
                  <span className="project-detail__owner-name">{owner.name || owner.username}</span>
                  <span className="project-detail__owner-handle">@{owner.username}</span>
                </span>
              </Link>

              {project.is_owner ? (
                <div className="row" style={{ gap: "0.5rem" }}>
                  <Link className="btn btn-primary btn-sm" to={`/home?project=${project.id}#compose`}>
                    <Send size={14} aria-hidden="true" />
                    Share update
                  </Link>
                  <Link className="btn btn-secondary btn-sm" to={`/projects/${project.id}/edit`}>
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              ) : (
                <div className="row" style={{ gap: "0.5rem" }}>
                  <Link className="btn btn-secondary btn-sm" to={`/profile/${owner.username}`}>
                    View profile
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setReportOpen(true)}
                    title="Report this project"
                  >
                    <Flag size={14} aria-hidden="true" />
                    Report
                  </button>
                </div>
              )}
            </div>

            <div className="project-detail__links">
              {project.repo_url && (
                <a className="project-link" href={project.repo_url} target="_blank" rel="noreferrer">
                  <GitBranch size={15} aria-hidden="true" />
                  Repository
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              )}
              {project.live_url && (
                <a className="project-link" href={project.live_url} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} aria-hidden="true" />
                  Live site
                </a>
              )}
              <span className="project-detail__date">
                <CalendarDays size={14} aria-hidden="true" />
                Added {formatMonthYear(project.created_at)}
              </span>
            </div>
          </div>
        </article>

        {error && <div className="alert alert--error" role="alert">{error}</div>}

        <section className="card project-detail__section">
          <h2>About this project</h2>
          {project.description ? (
            <p className="project-detail__description">{project.description}</p>
          ) : (
            <p className="muted">The owner hasn’t added a longer description yet.</p>
          )}
        </section>

        {tech.length > 0 && (
          <section className="card project-detail__section">
            <h2>Built with</h2>
            <div className="chip-row">
              {tech.map((item) => (
                <span key={item} className="chip">{item}</span>
              ))}
            </div>
          </section>
        )}

        <CollaborationSection project={project} onRefresh={refreshProject} />

        {reportOpen && (
          <ReportDialog
            targetType="project"
            targetId={project.id}
            targetLabel={project.title}
            onClose={() => setReportOpen(false)}
          />
        )}
      </div>
    </AppShell>
  );
}
