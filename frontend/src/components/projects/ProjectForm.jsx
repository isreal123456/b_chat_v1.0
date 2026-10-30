import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ImagePlus, Trash2 } from "lucide-react";

import Field from "../settings/Field";
import Toggle from "../settings/Toggle";
import SkillsInput from "../profile/SkillsInput";
import ProjectCover from "./ProjectCover";
import { PROJECT_STATUSES } from "../../lib/projects";

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function ProjectForm({
  project = null,
  onSubmit,
  busy = false,
  error = "",
  notice = "",
  submitLabel = "Publish project",
  cancelTo = "/projects",
}) {
  const [title, setTitle] = useState(project?.title || "");
  const [tagline, setTagline] = useState(project?.tagline || "");
  const [description, setDescription] = useState(project?.description || "");
  const [category, setCategory] = useState(project?.category || "");
  const [techStack, setTechStack] = useState(project?.tech_stack || []);
  const [repoUrl, setRepoUrl] = useState(project?.repo_url || "");
  const [liveUrl, setLiveUrl] = useState(project?.live_url || "");
  const [status, setStatus] = useState(project?.status || "in_progress");
  const [collaborators, setCollaborators] = useState(Boolean(project?.looking_for_collaborators));
  const [coverFile, setCoverFile] = useState(null);
  const [coverHint, setCoverHint] = useState("");
  const [removeCover, setRemoveCover] = useState(false);

  const previewUrl = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : ""),
    [coverFile],
  );

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleCover = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverHint("");
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setCoverHint("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setCoverHint("Cover image must be 5 MB or smaller.");
      return;
    }
    setCoverFile(file);
    setRemoveCover(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(
      {
        title: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        category,
        tech_stack: techStack,
        repo_url: repoUrl.trim(),
        live_url: liveUrl.trim(),
        status,
        looking_for_collaborators: collaborators,
      },
      coverFile,
      removeCover,
    );
  };

  const showExistingCover = Boolean(project?.cover_url) && !removeCover;

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert--error" role="alert">{error}</div>
      )}
      {notice && (
        <div className="alert alert--success" role="status">{notice}</div>
      )}

      <section className="card project-form__card">
        <h2 className="project-form__heading">Project details</h2>
        <div className="project-form__grid">
          <Field label="Title">
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="Realtime collaboration board"
              required
            />
          </Field>
          <Field label="Category">
            <select
              className="input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Not specified</option>
              <option value="developer">Developer</option>
              <option value="designer">Designer</option>
            </select>
          </Field>
        </div>

        <Field label="Tagline" hint="One line that sells the idea.">
          <input
            className="input"
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            maxLength={160}
            placeholder="A shared canvas for design critiques"
          />
        </Field>

        <Field label="Description">
          <textarea
            className="input"
            rows={6}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={4000}
            placeholder="What does it do, who is it for, and what are you proud of?"
          />
        </Field>
      </section>

      <section className="card project-form__card">
        <h2 className="project-form__heading">Stack and links</h2>
        <Field label="Tools and technologies">
          <SkillsInput
            id="project-tech"
            value={techStack}
            onChange={setTechStack}
            max={12}
            label="tools"
            placeholder="React, FastAPI, PostgreSQL…"
          />
        </Field>

        <div className="project-form__grid">
          <Field label="Repository">
            <input
              className="input"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              maxLength={255}
              placeholder="https://github.com/you/project"
              inputMode="url"
            />
          </Field>
          <Field label="Live site">
            <input
              className="input"
              value={liveUrl}
              onChange={(event) => setLiveUrl(event.target.value)}
              maxLength={255}
              placeholder="https://project.dev"
              inputMode="url"
            />
          </Field>
        </div>
      </section>

      <section className="card project-form__card">
        <h2 className="project-form__heading">Cover and status</h2>

        <div className="project-form__cover">
          <div className="project-form__cover-preview">
            {previewUrl ? (
              <img src={previewUrl} alt="Selected project cover preview" />
            ) : showExistingCover ? (
              <ProjectCover project={project} />
            ) : (
              <span className="project-form__cover-empty">
                <ImagePlus size={22} aria-hidden="true" />
                No cover yet
              </span>
            )}
          </div>

          <div className="stack" style={{ gap: "0.5rem" }}>
            <label className="btn btn-secondary btn-sm project-form__file">
              <ImagePlus size={15} aria-hidden="true" />
              {coverFile || showExistingCover ? "Replace cover" : "Upload cover"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleCover} />
            </label>
            {(showExistingCover || coverFile) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setCoverFile(null);
                  setRemoveCover(true);
                }}
              >
                <Trash2 size={15} aria-hidden="true" />
                Remove cover
              </button>
            )}
            <p className="hint">PNG, JPG, WebP, or GIF · up to 5 MB</p>
            {coverHint && <p className="hint" role="alert">{coverHint}</p>}
          </div>
        </div>

        <Field label="Status">
          <select
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {PROJECT_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>

        <Toggle
          checked={collaborators}
          onChange={setCollaborators}
          label="Looking for collaborators"
          hint="Show builders that this project is open to teaming up."
        />
      </section>

      <div className="project-form__actions">
        <Link className="btn btn-secondary" to={cancelTo}>Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy || !title.trim()}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
