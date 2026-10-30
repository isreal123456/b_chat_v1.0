import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../../../components/layout/AppShell";
import ProjectForm from "../../../components/projects/ProjectForm";
import { createProject, uploadProjectCover } from "../../../lib/api";

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (payload, coverFile) => {
    setBusy(true);
    setError("");
    let project;
    try {
      project = await createProject(payload);
    } catch (requestError) {
      setError(requestError.message || "Could not publish the project.");
      setBusy(false);
      return;
    }

    if (coverFile) {
      try {
        await uploadProjectCover(project.id, coverFile);
      } catch {
        navigate(`/projects/${project.id}/edit`, {
          replace: true,
          state: {
            notice: "Project published. The cover upload failed — try adding it again below.",
          },
        });
        return;
      }
    }

    navigate(`/projects/${project.id}`, { replace: true });
  };

  return (
    <AppShell title="New project" subtitle="Show what you built">
      <div className="page-enter">
        <header className="page-head">
          <div>
            <p className="eyebrow">Showcase</p>
            <h1 className="page-head__title">Publish a project</h1>
            <p className="page-head__sub">
              Share the problem, the stack, and what makes it yours. Links and covers make it easy for people to dig in.
            </p>
          </div>
        </header>

        <ProjectForm
          onSubmit={handleSubmit}
          busy={busy}
          error={error}
          submitLabel="Publish project"
          cancelTo="/projects"
        />
      </div>
    </AppShell>
  );
}
