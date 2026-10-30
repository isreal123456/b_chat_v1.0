import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import AppShell from "../../../../components/layout/AppShell";
import ProjectForm from "../../../../components/projects/ProjectForm";
import {
  deleteProjectCover,
  fetchProject,
  updateProject,
  uploadProjectCover,
} from "../../../../lib/api";

export default function EditProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = location.state?.notice || "";
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  const handleSubmit = async (payload, coverFile, removeCover) => {
    setBusy(true);
    setError("");
    try {
      await updateProject(project.id, payload);
      if (coverFile) {
        await uploadProjectCover(project.id, coverFile);
      } else if (removeCover) {
        await deleteProjectCover(project.id);
      }
      navigate(`/projects/${project.id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Could not save the project.");
      setBusy(false);
    }
  };

  if (loading || (project && String(project.id) !== String(id))) {
    return (
      <AppShell title="Edit project">
        <div className="card skeleton" style={{ height: 420 }} />
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell title="Edit project">
        <div className="empty-state">
          <h3>Project not found</h3>
          <p>{error || "It may have been removed by its owner."}</p>
          <Link className="btn btn-secondary btn-sm" to="/projects">Browse projects</Link>
        </div>
      </AppShell>
    );
  }

  if (!project.is_owner) {
    return (
      <AppShell title="Edit project">
        <div className="empty-state">
          <h3>Not your project</h3>
          <p>Only the owner can edit this project.</p>
          <Link className="btn btn-secondary btn-sm" to={`/projects/${project.id}`}>
            View project
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit project" subtitle={project.title}>
      <div className="page-enter">
        <header className="page-head">
          <div>
            <p className="eyebrow">Showcase</p>
            <h1 className="page-head__title">Edit project</h1>
            <p className="page-head__sub">Keep the story and links current as the project evolves.</p>
          </div>
        </header>

        <ProjectForm
          key={project.updated_at}
          project={project}
          onSubmit={handleSubmit}
          busy={busy}
          error={error}
          notice={notice}
          submitLabel="Save changes"
          cancelTo={`/projects/${project.id}`}
        />
      </div>
    </AppShell>
  );
}
