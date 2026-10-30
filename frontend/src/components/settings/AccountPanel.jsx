import { useState } from "react";
import Field from "./Field";
import SectionCard from "./SectionCard";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";

export default function AccountPanel() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);

  const updatePassword = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });
    setSaving(true);
    try {
      await api("/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setStatus({ type: "success", message: "Password updated." });
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Could not update password." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-stack">
      <SectionCard title="Account" description="The email you use to sign in to TickMe.">
        <Field label="Email address" hint="Email changes are coming in a future update.">
          <input type="email" value={user?.email || ""} readOnly className="input" />
        </Field>
      </SectionCard>

      <SectionCard title="Password" description="Use at least 8 characters. Never reuse your TickMe password elsewhere.">
        <form className="form-stack" onSubmit={updatePassword}>
          <Field label="Current password">
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
              className="input"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              className="input"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>

          {status.message && (
            <p role={status.type === "error" ? "alert" : "status"} className={`alert alert--${status.type}`}>
              {status.message}
            </p>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !currentPassword || newPassword.length < 8}
            >
              {saving ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Two-factor authentication" description="An extra step at sign-in keeps your account safe.">
        <p className="settings-note">Two-factor authentication is not available yet.</p>
      </SectionCard>

      <SectionCard title="Danger zone" description="Destructive actions that affect your whole account.">
        <div className="settings-row">
          <div>
            <p className="settings-row__label">Delete account</p>
            <p className="settings-row__hint">This can&apos;t be undone.</p>
          </div>
          <p className="settings-row__hint">Contact support to delete your account.</p>
        </div>
      </SectionCard>
    </div>
  );
}
