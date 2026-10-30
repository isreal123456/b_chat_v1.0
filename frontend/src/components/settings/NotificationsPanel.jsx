import SectionCard from "./SectionCard";
import Toggle from "./Toggle";
import { usePreferences } from "../../hooks/usePreferences";

export default function NotificationsPanel() {
  const { preferences: prefs, loading, saving, error, update } = usePreferences();

  return (
    <SectionCard title="Notifications" description="Choose what you want to be notified about.">
      {loading && <p role="status" className="settings-note">Loading preferences…</p>}
      {!loading && !prefs && <p role="alert" className="alert alert--error">{error}</p>}
      {prefs && (
        <div>
          <Toggle checked={prefs.ticks} onChange={(v) => update("ticks", v)} disabled={saving} label="Ticks" hint="When someone Ticks your post" />
          <Toggle checked={prefs.comments} onChange={(v) => update("comments", v)} disabled={saving} label="Comments" hint="When someone comments on your post" />
          <Toggle checked={prefs.follows} onChange={(v) => update("follows", v)} disabled={saving} label="Connections" hint="When someone sends or accepts a connection request" />
          <Toggle checked={prefs.messages} onChange={(v) => update("messages", v)} disabled={saving} label="Messages" hint="When you receive a new message" />
        </div>
      )}
      <p className="settings-note">Email notifications are not available yet.</p>
      {error && prefs && <p role="alert" className="alert alert--error form-status">{error}</p>}
    </SectionCard>
  );
}
