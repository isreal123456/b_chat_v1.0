"use client";

import { useState } from "react";
import SectionCard from "./SectionCard";
import Toggle from "./Toggle";

export default function NotificationsPanel() {
  const [prefs, setPrefs] = useState({
    likes: true,
    comments: true,
    follows: true,
    messages: true,
    email: false,
  });

  const update = (key) => (val) => setPrefs({ ...prefs, [key]: val });

  return (
    <SectionCard title="Notifications" description="Choose what you want to be notified about.">
      <div className="divide-y divide-neutral-700">
        <Toggle checked={prefs.likes} onChange={update("likes")} label="Likes" hint="When someone likes your post" />
        <Toggle checked={prefs.comments} onChange={update("comments")} label="Comments" hint="When someone comments on your post" />
        <Toggle checked={prefs.follows} onChange={update("follows")} label="New followers" hint="When someone follows you" />
        <Toggle checked={prefs.messages} onChange={update("messages")} label="Messages" hint="When you receive a new message" />
        <Toggle checked={prefs.email} onChange={update("email")} label="Email notifications" hint="Get a summary sent to your inbox" />
      </div>
    </SectionCard>
  );
}
