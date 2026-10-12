"use client";

import { ImagePlus, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, getMediaUrl } from "../../lib/api";

export default function PostComposer({ onPostCreated }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => { api("/users/me").then(setProfile).catch(() => setProfile(null)); }, []);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!attachment) {
      setImagePreview("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(attachment);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [attachment]);

  const handleImageChange = (event) => {
    const selected = event.target.files?.[0] || null;
    event.target.value = "";
    setError("");
    if (!selected) return;
    const isImage = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(selected.type);
    const isVideo = ["video/mp4", "video/webm"].includes(selected.type);
    if (!isImage && !isVideo) {
      setError("Choose a JPEG, PNG, WebP, GIF, MP4, or WebM file.");
      return;
    }
    if (selected.size > (isVideo ? 25 : 5) * 1024 * 1024) {
      setError(isVideo ? "Videos must be 25 MB or smaller." : "Images must be 5 MB or smaller.");
      return;
    }
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
      await onPostCreated(content, attachment);
      setText("");
      setAttachment(null);
    } catch (requestError) {
      setError(requestError.message || "Could not create the post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="feed-composer">
      <div className="feed-composer-prompt">
        <img
          src={profile?.avatar_url ? getMediaUrl(profile.avatar_url) : "/avatar-placeholder.svg"}
          onError={(event) => { event.currentTarget.src = "/avatar-placeholder.svg"; }}
          alt="Your profile"
          className="feed-composer-avatar"
        />
        <div className="feed-composer-field">
          <label htmlFor="post-content">Share something with your community</label>
          <textarea
            id="post-content"
            aria-label="Write a post"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What is on your mind?"
            maxLength={5000}
            rows={2}
          />
        </div>
      </div>
      {imagePreview && attachment && (
        <div className="post-image-preview">
          {attachment.type.startsWith("video/")
            ? <video src={imagePreview} aria-label="Selected video preview" muted playsInline controls />
            : <img src={imagePreview} alt="Selected post attachment preview" />}
          <button type="button" onClick={() => setAttachment(null)} aria-label="Remove selected attachment" title="Remove attachment">
            <X size={16} />
          </button>
          <span>{attachment.name}</span>
        </div>
      )}
      <div className="feed-composer-footer">
        <input id="post-media" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={handleImageChange} className="sr-only" />
        <label htmlFor="post-media" title="Add a photo or video" className="feed-attach-button">
          <ImagePlus size={17} aria-hidden="true" />
          <span>Add photo or video</span>
        </label>
        <div className="feed-composer-submit">
          <span>{text.length}/5000</span>
          <button
            type="submit"
            disabled={submitting || (!text.trim() && !attachment)}
          >
            <Send size={15} aria-hidden="true" />
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="feed-composer-error">{error}</p>}
    </form>
  );
}
