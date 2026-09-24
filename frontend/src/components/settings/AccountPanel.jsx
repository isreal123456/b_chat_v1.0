"use client";

import Field from "./Field";
import SectionCard from "./SectionCard";
import Toggle from "./Toggle";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function AccountPanel() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/users/me").then((user) => setEmail(user.email)).catch(() => undefined);
  }, []);

  const updatePassword = async (event) => {
    event.preventDefault();
    setStatus("");
    setSaving(true);
    try {
      await api("/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setStatus("Password updated.");
    } catch (error) {
      setStatus(error.message || "Could not update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Email & password">
        <form className="space-y-4" onSubmit={updatePassword}>
          <Field label="Email address">
            <input
              type="email"
              value={email}
              readOnly
              className="w-full bg-neutral-900 text-white rounded-lg px-4 py-2.5 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </Field>
          <Field label="Current password">
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
              className="w-full bg-neutral-900 text-white rounded-lg px-4 py-2.5 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </Field>
          <Field label="New password" hint="Use at least 8 characters.">
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              minLength={8}
              className="w-full bg-neutral-900 text-white rounded-lg px-4 py-2.5 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </Field>
          {status && <p role="status" className="text-sm text-neutral-300">{status}</p>}
          <button type="submit" disabled={saving || !currentPassword || newPassword.length < 8} className="mt-1 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-neutral-900 text-sm font-semibold rounded-lg px-5 py-2.5 transition-colors">
            {saving ? "Updating..." : "Update password"}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Two-factor authentication" description="Add an extra layer of security to your account.">
        <Toggle checked={false} onChange={() => {}} label="Enable two-factor authentication" />
      </SectionCard>

      <SectionCard title="Danger zone">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Delete account</p>
            <p className="text-xs text-neutral-500 mt-0.5">This can't be undone.</p>
          </div>
          <button type="button" className="text-sm border border-red-400/40 text-red-400 hover:bg-red-400/10 rounded-lg px-4 py-2 transition-colors">
            Delete account
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
