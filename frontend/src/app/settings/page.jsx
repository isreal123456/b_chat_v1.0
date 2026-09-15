"use client";

import { useState } from "react";
import { User, Bell, Lock, Shield } from "lucide-react";
import TopNav from "../../components/ui/navbar";
import SettingsNav from "../../components/ui/settingnav";
import ProfilePanel from "../../components/settings/ProfilePanel";
import AccountPanel from "../../components/settings/AccountPanel";
import NotificationsPanel from "../../components/settings/NotificationsPanel";
import PrivacyPanel from "../../components/settings/PrivacyPanel";
import AppearancePanel from "../../components/settings/AppearancePanel";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account & Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
];

export default function SettingsPage() {
  const [active, setActive] = useState("profile");

  const panels = {
    profile: <ProfilePanel />,
    account: <AccountPanel />,
    notifications: <NotificationsPanel />,
    privacy: <PrivacyPanel />,
    appearance: <AppearancePanel />,
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      <TopNav />

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 px-6 pb-10">
        <SettingsNav active={active} onSelect={setActive} tabs={tabs} />
        <div>{panels[active] || <ProfilePanel />}</div>
      </div>
    </div>
  );
}
