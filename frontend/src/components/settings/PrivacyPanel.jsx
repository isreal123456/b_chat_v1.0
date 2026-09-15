"use client";

import { useState } from "react";
import SectionCard from "./SectionCard";
import Toggle from "./Toggle";

export default function PrivacyPanel() {
  const [prefs, setPrefs] = useState({
    privateAccount: false,
    showActivity: true,
    tagging: true,
  });

  const update = (key) => (val) => setPrefs({ ...prefs, [key]: val });

  return (
    <SectionCard title="Privacy" description="Control who can see your content and activity.">
      <div className="divide-y divide-neutral-700">
        <Toggle
          checked={prefs.privateAccount}
          onChange={update("privateAccount")}
          label="Private account"
          hint="Only approved followers can see your posts"
        />
        <Toggle
          checked={prefs.showActivity}
          onChange={update("showActivity")}
          label="Show activity status"
          hint="Let others see when you're online"
        />
        <Toggle
          checked={prefs.tagging}
          onChange={update("tagging")}
          label="Allow tagging"
          hint="Let others tag you in posts and photos"
        />
      </div>
    </SectionCard>
  );
}
