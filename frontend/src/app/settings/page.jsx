import { useState } from "react";
import { Bell, Lock, Palette, Shield, UserRound } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import ProfilePanel from "../../components/settings/ProfilePanel";
import AccountPanel from "../../components/settings/AccountPanel";
import NotificationsPanel from "../../components/settings/NotificationsPanel";
import PrivacyPanel from "../../components/settings/PrivacyPanel";
import AppearancePanel from "../../components/settings/AppearancePanel";

const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "account", label: "Account & security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
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
    <AppShell title="Settings" subtitle="Tune your profile, account, and workspace">
      <div className="settings-layout">
        <nav className="card settings-nav" aria-label="Settings sections">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`settings-nav__item${active === id ? " is-active" : ""}`}
              aria-current={active === id ? "page" : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <div className="settings-stack">{panels[active]}</div>
      </div>
    </AppShell>
  );
}
