import { useState } from "react";

import { getMediaUrl } from "../../lib/api";

export default function ProjectCover({ project, className = "" }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(project.cover_url) && !failed;

  return (
    <div className={`project-cover ${className}`.trim()} data-category={project.category || "default"}>
      {showImage ? (
        <img
          src={getMediaUrl(project.cover_url)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="project-cover__monogram" aria-hidden="true">
          {(project.title || "P").slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}
