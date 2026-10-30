import { Link } from "react-router-dom";

import Avatar from "../ui/Avatar";
import ProjectCover from "./ProjectCover";
import { getMediaUrl } from "../../lib/api";
import { statusLabel } from "../../lib/projects";

export default function ProjectCard({ project, showOwner = true }) {
  const tech = Array.isArray(project.tech_stack) ? project.tech_stack : [];
  const owner = project.owner || {};

  return (
    <Link className="project-card" to={`/projects/${project.id}`}>
      <ProjectCover project={project} className="project-card__cover" />

      <div className="project-card__body">
        <div className="project-card__badges">
          <span className={`badge ${project.status === "shipped" ? "badge--accent" : "badge--neutral"}`}>
            {statusLabel(project.status)}
          </span>
          {project.looking_for_collaborators && (
            <span className="badge badge--outline">Open to collaborate</span>
          )}
        </div>

        <h3 className="project-card__title">{project.title}</h3>
        {project.tagline && <p className="project-card__tagline">{project.tagline}</p>}

        {tech.length > 0 && (
          <div className="chip-row project-card__tech">
            {tech.slice(0, 4).map((item) => (
              <span key={item} className="chip chip--sm">{item}</span>
            ))}
            {tech.length > 4 && <span className="chip chip--sm">+{tech.length - 4}</span>}
          </div>
        )}

        {showOwner && owner.username && (
          <div className="project-card__owner">
            <Avatar
              name={owner.name || owner.username}
              src={owner.avatar_url ? getMediaUrl(owner.avatar_url) : ""}
              size={26}
            />
            <span>{owner.name || owner.username}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
