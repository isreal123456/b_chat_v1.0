import { FolderKanban, ImagePlus, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import Avatar from "../ui/Avatar";
import { fetchUserProjects, getMediaUrl } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];

export default function PostComposer({ onPostCreated, project = null }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectChoice, setProjectChoice] = useState(undefined);
  const previewRef = useRef("");

  useEffect(() => {
    if (!user?.username) return undefined;
    let active = true;
    fetchUserProjects(user.username, { limit: 50 })
      .then((data) => {
        if (active) setProjects(data.items || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.username]);

  const projectOptions =
    project && !projects.some((item) => item.id === project.id) ? [project, ...projects] : projects;
  const selectedProjectId = projectChoice === undefined ? project?.id ?? null : projectChoice;


  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const clearAttachment = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreview("");
    setAttachment(null);
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] || null;
    event.target.value = "";
    setError("");
    if (!selected) return;

    const isImage = IMAGE_TYPES.includes(selected.type);
    const isVideo = VIDEO_TYPES.includes(selected.type);
    if (!isImage && !isVideo) {
      setError("Choose a JPEG, PNG, WebP, GIF, MP4, or WebM file.");
      return;
    }
    if (selected.size > (isVideo ? 25 : 5) * 1024 * 1024) {
      setError(isVideo ? "Videos must be 25 MB or smaller." : "Images must be 5 MB or smaller.");
      return;
    }

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const nextPreview = URL.createObjectURL(selected);
    previewRef.current = nextPreview;
    setPreview(nextPreview);
    setAttachment(selected);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const content = text.trim();
    if (!content && !attachment) {
      setError("Write something or add a photo or video before posting.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await onPostCreated(content, attachment, selectedProjectId);
      setText("");
      clearAttachment();
      setProjectChoice(undefined);
    } catch (requestError) {
      setError(requestError.message || "Could not create the post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="compose" onSubmit={handleSubmit} className="card composer">
      <Avatar
        name={user?.name || user?.username || "You"}
        src={user?.avatar_url ? getMediaUrl(user.avatar_url) : ""}
        size={46}
      />
      <div className="composer__body">
        <div className="composer__field">
          <label htmlFor="post-content" className="sr-only">Write a post</label>
          <textarea
            id="post-content"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Share an update, a question, or something you shipped…"
            maxLength={5000}
            rows={3}
          />
        </div>

        {preview && attachment && (
          <div className="composer__preview">
            {attachment.type.startsWith("video/") ? (
              <video src={preview} aria-label="Selected video preview" muted playsInline controls />
            ) : (
              <img src={preview} alt="Selected attachment preview" />
            )}
            <div className="composer__preview-meta">
              <span>{attachment.name}</span>
              <button type="button" onClick={clearAttachment} aria-label="Remove attachment" title="Remove attachment">
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        <div className="composer__foot">
          <div className="composer__tools">
            <input
              id="post-media"
              type="file"
              accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
              onChange={handleFileChange}
              className="sr-only"
            />
            <label htmlFor="post-media" className="btn btn-ghost btn-sm" title="Add a photo or video">
              <ImagePlus size={16} aria-hidden="true" />
              Media
            </label>
            {projectOptions.length > 0 && (
              <label className="composer__project" title="Attach this post to one of your projects">
                <FolderKanban size={15} aria-hidden="true" />
                <span className="sr-only">Tag a project</span>
                <select
                  value={selectedProjectId ?? ""}
                  onChange={(event) =>
                    setProjectChoice(event.target.value ? Number(event.target.value) : null)
                  }
                >
                  <option value="">Tag a project</option>
                  {projectOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="row" style={{ gap: "0.7rem" }}>
            <span className="composer__count">{text.length}/5000</span>
            <button type="submit" className="btn btn-primary" disabled={submitting || (!text.trim() && !attachment)}>
              <Send size={15} aria-hidden="true" />
              {submitting ? "Posting…" : "Post update"}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="muted" style={{ fontSize: "0.78rem" }}>{error}</p>
        )}
      </div>
    </form>
  );
}
