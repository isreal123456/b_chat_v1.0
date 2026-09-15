"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import Field from "./Field";
import SectionCard from "./SectionCard";

export default function ProfilePanel() {
  const [form, setForm] = useState({
    name: "Elviz Dizzouza",
    username: "elvizoodem",
    bio: "Hello, I'm a UI/UX designer. Open to new projects.",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="space-y-6">
      <SectionCard title="Profile photo">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src="https://i.pravatar.cc/200?img=68"
              alt="Profile"
              className="w-20 h-20 rounded-2xl object-cover"
            />
            <button
              type="button"
              className="absolute -bottom-1 -right-1 p-1.5 bg-yellow-400 rounded-lg text-neutral-900"
            >
              <Camera size={14} />
            </button>
          </div>
          <div className="flex gap-2">
            <button className="text-sm bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg px-4 py-2 transition-colors">
              Upload new
            </button>
            <button className="text-sm text-neutral-400 hover:text-white rounded-lg px-4 py-2 transition-colors">
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

        <button className="mt-5 bg-yellow-400 hover:bg-yellow-300 text-neutral-900 text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors">
          Save changes
        </button>
      </SectionCard>
    </div>
  );
}
