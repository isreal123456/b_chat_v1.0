"use client";

import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import Field from "./Field";
import SectionCard from "./SectionCard";
import { api, getMediaUrl } from "../../lib/api";

export default function ProfilePanel() {
  const [form, setForm] = useState({
    name: "",
    username: "",
    bio: "",
    avatar_url: "",
  });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/users/me").then((user) => {
      setForm((current) => ({
        ...current,
        name: user.name || user.username,
        username: user.username,
        avatar_url: user.avatar_url,
      }));
    }).catch(() => undefined);
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleAvatar = async (event) => {
    const image = event.target.files?.[0];
    if (!image) return;
    setStatus("");
    const body = new FormData();
    body.append("image", image);
    try {
      const result = await api("/users/me/avatar", { method: "POST", body });
      setForm((current) => ({ ...current, avatar_url: result.avatar_url }));
      setStatus("Profile picture updated.");
    } catch (error) {
      setStatus(error.message || "Could not upload profile picture.");
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await api("/users/me/avatar", { method: "DELETE" });
      setForm((current) => ({ ...current, avatar_url: "" }));
      setStatus("Profile picture removed.");
    } catch (error) {
      setStatus(error.message || "Could not remove profile picture.");
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setStatus("");
    setSaving(true);
    try {
      const user = await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ username: form.username.trim() }),
      });
      setForm((current) => ({ ...current, username: user.username }));
      setStatus("Username saved.");
    } catch (error) {
      setStatus(error.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSave}>
      <SectionCard title="Profile photo">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={form.avatar_url ? getMediaUrl(form.avatar_url) : `https://i.pravatar.cc/200?u=${form.username || "profile"}`}
              alt="Profile"
              className="w-20 h-20 rounded-2xl object-cover"
            />
            <button
              type="button"
              onClick={() => document.getElementById("avatar-upload").click()}
              aria-label="Choose profile picture"
              className="absolute -bottom-1 -right-1 p-1.5 bg-yellow-400 rounded-lg text-neutral-900"
            >
              <Camera size={14} />
            </button>
          </div>
          <div className="flex gap-2">
            <input id="avatar-upload" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatar} className="sr-only" />
            <label htmlFor="avatar-upload" className="cursor-pointer text-sm bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg px-4 py-2 transition-colors">
              Upload new
            </label>
            <button type="button" onClick={handleRemoveAvatar} className="text-sm text-neutral-400 hover:text-white rounded-lg px-4 py-2 transition-colors">
              Remove
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Basic info" description="This is how others will see you on the platform.">
        <div className="space-y-4">
          <Field label="Full name">
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full bg-neutral-900 text-white rounded-lg px-4 py-2.5 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </Field>

          <Field label="Username">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">@</span>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="w-full bg-neutral-900 text-white rounded-lg pl-8 pr-4 py-2.5 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
              className="w-full bg-neutral-900 text-white rounded-lg px-4 py-2.5 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
            />
          </Field>
        </div>

        {status && <p role="status" className="mt-4 text-sm text-neutral-300">{status}</p>}
        <button type="submit" disabled={saving || !form.username.trim()} className="mt-5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-neutral-900 text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors">
          {saving ? "Saving..." : "Save changes"}
        </button>
      </SectionCard>
    </form>
  );
}
