import {
  Bell,
  Bookmark,
  Compass,
  FolderKanban,
  Handshake,
  Home,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useState } from "react";

import Logo from "../brand/Logo";
import Avatar from "../ui/Avatar";
import ThemeToggle from "../ui/ThemeToggle";
import SetupBanners from "./SetupBanners";
import { useAuth } from "../../providers/AuthProvider";
import { useNotifications } from "../../providers/NotificationProvider";
import { getMediaUrl } from "../../lib/api";

const primaryLinks = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/messages", label: "Messages", icon: MessageCircle },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

const secondaryLinks = [
  { to: "/friend-requests", label: "Connections", icon: Users },
  { to: "/collaboration-requests", label: "Collaborations", icon: Handshake },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/settings", label: "Settings", icon: Settings },
];

const mobileLinks = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/messages", label: "Chat", icon: MessageCircle },
  { to: "/notifications", label: "Alerts", icon: Bell },
];

function navClass({ isActive }) {
  return `rail-link${isActive ? " is-active" : ""}`;
}

function NotificationBadge({ count, className = "" }) {
  if (!count) return null;
  return (
    <span
      className={`nav-badge${className ? ` ${className}` : ""}`}
      aria-label={`${count} unread notifications`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function AppShell({ title, subtitle, right = null, wide = false, children }) {
  const { user, logout } = useAuth();
  const { unread } = useNotifications();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/explore?q=${encodeURIComponent(trimmed)}` : "/explore");
  };

  return (
    <div className="shell">
      <aside className="shell__rail">
        <Logo to={user ? "/home" : "/"} />

        <nav className="rail-nav" aria-label="Primary">
          {primaryLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navClass}>
              <Icon size={19} aria-hidden="true" />
              <span className="rail-link__label">{label}</span>
              {to === "/notifications" && (
                <NotificationBadge count={unread} className="nav-badge--rail" />
              )}
            </NavLink>
          ))}
        </nav>

        <Link className="btn btn-primary rail-create" to="/home#compose">
          Share an update
        </Link>

        <div className="rail-section">
          <p className="rail-section__label">Network</p>
          <nav className="rail-nav" aria-label="Network">
            {secondaryLinks.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={navClass}>
                <Icon size={19} aria-hidden="true" />
                <span className="rail-link__label">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {user?.admin_role && (
          <div className="rail-section">
            <p className="rail-section__label">Console</p>
            <nav className="rail-nav" aria-label="Administration">
              <NavLink to="/admin" className={navClass}>
                <ShieldCheck size={19} aria-hidden="true" />
                <span className="rail-link__label">Admin console</span>
              </NavLink>
            </nav>
          </div>
        )}

        <div className="rail-footer">
          <div className="row" style={{ gap: "0.4rem" }}>
            <Link className="rail-user" to={user ? `/profile/${user.username}` : "/login"}>
              <Avatar name={user?.name || user?.username || "You"} src={user?.avatar_url ? getMediaUrl(user.avatar_url) : ""} size={36} />
              <span className="rail-user__copy">
                <span className="rail-user__name">{user?.name || user?.username || "Your profile"}</span>
                <span className="rail-user__handle">@{user?.username || "you"}</span>
              </span>
            </Link>
            <button
              type="button"
              className="rail-user__action"
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
          <div style={{ marginTop: "0.6rem" }}>
            <ThemeToggle labeled />
          </div>
        </div>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <span className="topbar__brand">
            <Logo to="/home" compact />
          </span>
          <div className="topbar__heading">
            <p className="topbar__title">{title}</p>
            {subtitle && <p className="topbar__subtitle">{subtitle}</p>}
          </div>

          <form className="topbar__search" role="search" onSubmit={handleSearch}>
            <Search size={16} aria-hidden="true" />
            <label htmlFor="global-search" className="sr-only">Search people</label>
            <input
              id="global-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people by name or @handle"
              autoComplete="off"
            />
          </form>

          <div className="topbar__actions">
            <ThemeToggle />
            {user?.admin_role && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `btn-icon topbar__projects${isActive ? " is-active" : ""}`}
                aria-label="Admin console"
                title="Admin console"
              >
                <ShieldCheck size={18} aria-hidden="true" />
              </NavLink>
            )}
            <NavLink
              to="/projects"
              className={({ isActive }) => `btn-icon topbar__projects${isActive ? " is-active" : ""}`}
              aria-label="Projects"
              title="Projects"
            >
              <FolderKanban size={18} aria-hidden="true" />
            </NavLink>
            <NavLink
              to="/collaboration-requests"
              className={({ isActive }) => `btn-icon topbar__projects${isActive ? " is-active" : ""}`}
              aria-label="Collaboration requests"
              title="Collaboration requests"
            >
              <Handshake size={18} aria-hidden="true" />
            </NavLink>
            <NavLink
              to="/saved"
              className={({ isActive }) => `btn-icon topbar__projects${isActive ? " is-active" : ""}`}
              aria-label="Saved posts"
              title="Saved posts"
            >
              <Bookmark size={18} aria-hidden="true" />
            </NavLink>
            <NavLink
              to="/notifications"
              className={({ isActive }) => `btn-icon${isActive ? " is-active" : ""}`}
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={18} aria-hidden="true" />
              <NotificationBadge count={unread} />
            </NavLink>
            <NavLink
              to={user ? `/profile/${user.username}` : "/login"}
              aria-label="Your profile"
              title="Your profile"
            >
              <Avatar name={user?.name || user?.username || "You"} src={user?.avatar_url ? getMediaUrl(user.avatar_url) : ""} size={34} rounded />
            </NavLink>
          </div>
        </header>

        {right ? (
          <div className="with-rail">
            <main className={`content${wide ? " content--wide" : ""}`}>
              <SetupBanners />
              {children}
            </main>
            <aside className="right-rail">{right}</aside>
          </div>
        ) : (
          <main className={`content${wide ? " content--wide" : ""}`}>
            <SetupBanners />
            {children}
          </main>
        )}
      </div>

      <nav className="mobile-nav" aria-label="Mobile">
        {mobileLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `mobile-nav__link${isActive ? " is-active" : ""}`}
          >
            <Icon size={19} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        <NavLink
          to={user ? `/profile/${user.username}` : "/login"}
          className={({ isActive }) => `mobile-nav__link${isActive ? " is-active" : ""}`}
        >
          <UserRound size={19} aria-hidden="true" />
          Me
        </NavLink>
      </nav>
    </div>
  );
}
