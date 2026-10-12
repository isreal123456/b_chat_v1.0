"use client";

import SectionCard from "./SectionCard";
import Toggle from "./Toggle";
import { usePreferences } from "../../hooks/usePreferences";

export default function NotificationsPanel() {
  const { preferences: prefs, loading, saving, error, update } = usePreferences();

  return (
    <SectionCard title="Notifications" description="Choose what you want to be notified about.">
      {loading ? <p role="status" className="text-sm text-neutral-500">Loading preferences…</p> : !prefs ? <p role="alert" className="text-sm text-red-300">{error}</p> : <div className="divide-y divide-neutral-700">
        <Toggle checked={prefs.likes} onChange={(v) => update("likes", v)} disabled={saving} label="Likes" hint="When someone likes your post" />
        <Toggle checked={prefs.comments} onChange={(v) => update("comments", v)} disabled={saving} label="Comments" hint="When someone comments on your post" />
        <Toggle checked={prefs.follows} onChange={(v) => update("follows", v)} disabled={saving} label="Friend requests" hint="When someone sends or accepts a friend request" />
        <Toggle checked={prefs.messages} onChange={(v) => update("messages", v)} disabled={saving} label="Messages" hint="When you receive a new message" />
      </div>
      }
      <p className="mt-3 text-xs text-neutral-500">Email notifications are not available yet.</p>
      {error && prefs && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      {saving && <p role="status" className="mt-3 text-xs text-neutral-500">Saving…</p>}
    </SectionCard>
  );
}
