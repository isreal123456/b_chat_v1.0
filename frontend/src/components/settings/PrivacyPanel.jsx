import SectionCard from "./SectionCard";
import Toggle from "./Toggle";
import { usePreferences } from "../../hooks/usePreferences";

export default function PrivacyPanel() {
  const { preferences: prefs, loading, saving, error, update } = usePreferences();

  return (
    <SectionCard title="Privacy" description="Control who can see your content and activity.">
      {loading && <p role="status" className="settings-note">Loading preferences…</p>}
      {!loading && !prefs && <p role="alert" className="alert alert--error">{error}</p>}
      {prefs && (
        <div>
          <Toggle
            checked={prefs.private_account}
            onChange={(v) => update("private_account", v)}
            disabled={saving}
            label="Private account"
            hint="Only approved connections can see your posts"
          />
          <Toggle
            checked={prefs.allow_ticks}
            onChange={(v) => update("allow_ticks", v)}
            disabled={saving}
            label="Allow ticks on my posts"
            hint="Let other people tick your posts"
          />
        </div>
      )}
      {error && prefs && <p role="alert" className="alert alert--error form-status">{error}</p>}
    </SectionCard>
  );
}
