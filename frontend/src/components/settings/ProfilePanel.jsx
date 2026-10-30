import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import Field from "./Field";
import SectionCard from "./SectionCard";
import Toggle from "./Toggle";
import Avatar from "../ui/Avatar";
import SkillsInput from "../profile/SkillsInput";
import { api, getMediaUrl } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import { CATEGORIES } from "../../lib/profile";

export default function ProfilePanel() {
  const { user, updateUser } = useAuth();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    name: user?.name || "",
    username: user?.username || "",
    bio: user?.bio || "",
    headline: user?.headline || "",
    category: user?.category || "",
    skills: user?.skills || [],
    github_url: user?.github_url || "",
    portfolio_url: user?.portfolio_url || "",
    linkedin_url: user?.linkedin_url || "",
    location: user?.location || "",
    available_for_work: Boolean(user?.available_for_work),
  });
  const [avatar, setAvatar] = useState(user?.avatar_url || "");
  const [avatarVersion, setAvatarVersion] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);

  const notify = (type, message) => setStatus({ type, message });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleAvatar = async (event) => {
    const image = event.target.files?.[0];
    if (!image) return;
    notify("", "");
    const body = new FormData();
    body.append("image", image);
    try {
      const result = await api("/users/me/avatar", { method: "POST", body });
      setAvatar(result.avatar_url);
      setAvatarVersion(String(Date.now()));
      updateUser({ avatar_url: result.avatar_url });
      notify("success", "Profile photo updated.");
    } catch (error) {
      notify("error", error.message || "Could not upload profile picture.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await api("/users/me/avatar", { method: "DELETE" });
      setAvatar("");
      setAvatarVersion("");
      updateUser({ avatar_url: "" });
      notify("success", "Profile photo removed.");
    } catch (error) {
      notify("error", error.message || "Could not remove profile picture.");
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    notify("", "");
    setSaving(true);
    try {
      const saved = await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          username: form.username.trim(),
          name: form.name.trim(),
          bio: form.bio.trim(),
          headline: form.headline.trim(),
          category: form.category,
          skills: form.skills,
          github_url: form.github_url.trim(),
          portfolio_url: form.portfolio_url.trim(),
          linkedin_url: form.linkedin_url.trim(),
          location: form.location.trim(),
          available_for_work: form.available_for_work,
        }),
      });
      setForm((current) => ({
        ...current,
        name: saved.name,
        username: saved.username,
        bio: saved.bio,
        headline: saved.headline,
        category: saved.category,
        skills: saved.skills,
        github_url: saved.github_url,
        portfolio_url: saved.portfolio_url,
        linkedin_url: saved.linkedin_url,
        location: saved.location,
        available_for_work: saved.available_for_work,
      }));
      updateUser(saved);
      notify("success", "Profile saved.");
    } catch (error) {
      notify("error", error.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = avatar
    ? `${getMediaUrl(avatar)}${avatarVersion ? `?v=${avatarVersion}` : ""}`
    : "";

  return (
    <form onSubmit={handleSave} className="settings-stack">
      <SectionCard title="Profile photo" description="A clear photo or mark helps people recognise you across TickMe.">
        <div className="settings-avatar">
          <Avatar name={form.name || form.username} src={avatarSrc} size={76} />
          <div className="settings-avatar__actions">
            <input
              ref={fileRef}
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatar}
              className="sr-only"
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
              <Camera size={15} aria-hidden="true" />
              Upload new
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleRemoveAvatar}
              disabled={!avatar}
            >
              <Trash2 size={15} aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
        <p className="hint">JPEG, PNG, WebP, or GIF up to 5 MB.</p>
      </SectionCard>

      <SectionCard title="Basic info" description="This is how others see you on TickMe.">
        <div className="form-stack">
          <Field label="Full name">
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="input"
              autoComplete="name"
              required
            />
          </Field>

          <Field label="Username" hint="Your handle appears in your profile URL.">
            <div className="input-affix">
              <span className="input-affix__text" aria-hidden="true">@</span>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="input"
                autoComplete="username"
                spellCheck="false"
                required
              />
            </div>
          </Field>

          <Field label="Bio" hint={`${form.bio.length}/160 characters`}>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              maxLength={160}
              rows={3}
              className="textarea"
              placeholder="What do you build? What are you exploring?"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Professional profile" description="Give collaborators the context they need to reach out.">
        <div className="form-stack">
          <Field label="Focus">
            <select name="category" value={form.category} onChange={handleChange} className="select">
              <option value="">Choose a focus</option>
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Headline" hint="One line about what you build.">
            <input
              type="text"
              name="headline"
              value={form.headline}
              onChange={handleChange}
              className="input"
              maxLength={120}
              placeholder="Frontend engineer · design systems"
            />
          </Field>

          <Field label="Skills">
            <SkillsInput id="profile-skills" value={form.skills} onChange={(skills) => setForm((current) => ({ ...current, skills }))} />
          </Field>

          <Field label="GitHub">
            <input
              type="url"
              name="github_url"
              value={form.github_url}
              onChange={handleChange}
              className="input"
              placeholder="https://github.com/your-handle"
            />
          </Field>

          <Field label="Portfolio">
            <input
              type="url"
              name="portfolio_url"
              value={form.portfolio_url}
              onChange={handleChange}
              className="input"
              placeholder="https://your-site.dev"
            />
          </Field>

          <Field label="LinkedIn">
            <input
              type="url"
              name="linkedin_url"
              value={form.linkedin_url}
              onChange={handleChange}
              className="input"
              placeholder="https://linkedin.com/in/you"
            />
          </Field>

          <Field label="Location">
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              className="input"
              maxLength={100}
              placeholder="Berlin, remote"
            />
          </Field>

          <Toggle
            label="Open to work"
            hint="Show a badge on your profile so collaborators know you are available."
            checked={form.available_for_work}
            onChange={(value) => setForm((current) => ({ ...current, available_for_work: value }))}
          />
        </div>
      </SectionCard>

      {status.message && (
        <p role={status.type === "error" ? "alert" : "status"} className={`alert alert--${status.type}`}>
          {status.message}
        </p>
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving || !form.username.trim() || !form.name.trim()}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
