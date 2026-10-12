"use client";

import SectionCard from "./SectionCard";
import Toggle from "./Toggle";
import { usePreferences } from "../../hooks/usePreferences";

export default function PrivacyPanel() {
  const { preferences: prefs, loading, saving, error, update } = usePreferences();

  return (
    <SectionCard title="Privacy" description="Control who can see your content and activity.">
      {loading ? <p role="status" className="text-sm text-neutral-500">Loading preferences…</p> : !prefs ? <p role="alert" className="text-sm text-red-300">{error}</p> : <div className="divide-y divide-neutral-700">
        <Toggle
          checked={prefs.private_account}
          onChange={(v) => update("private_account", v)}
          disabled={saving}
          label="Private account"
          hint="Only approved followers can see your posts"
        />
      </div>
      }
      {error && prefs && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      {saving && <p role="status" className="mt-3 text-xs text-neutral-500">Saving…</p>}
    </SectionCard>
  );
}
