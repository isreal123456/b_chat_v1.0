import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  FileText,
  Flag,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";

import Logo from "../brand/Logo";
import Avatar from "../ui/Avatar";
import ThemeToggle from "../ui/ThemeToggle";
import { useAuth } from "../../providers/AuthProvider";
import { hasAdminPermission, fetchAdminReports } from "../../lib/admin";
import { getMediaUrl } from "../../lib/api";
import { ROLE_LABELS } from "../../lib/adminFormat";

const groups = [
  {
    label: "Workspace",
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, permission: "dashboard.view", end: true },
      { to: "/admin/analytics", label: "Analytics", icon: ChartNoAxesCombined, permission: "analytics.view" },
    ],
  },
  {
    label: "Community",
    items: [
      { to: "/admin/users", label: "Members", icon: Users, permission: "users.view" },
    ],
  },
  {
    label: "Moderation",
    items: [
      { to: "/admin/reports", label: "Reports", icon: Flag, permission: "reports.view", badge: "reports" },
      { to: "/admin/content/posts", label: "Posts", icon: FileText, permission: "content.view" },
      { to: "/admin/content/comments", label: "Comments", icon: MessageSquare, permission: "content.view" },
      { to: "/admin/projects", label: "Projects", icon: FolderKanban, permission: "projects.view" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/settings", label: "Settings", icon: SlidersHorizontal, permission: "settings.view" },
      { to: "/admin/activity", label: "Activity log", icon: ScrollText, permission: "activity.view" },
    ],
  },
];

function SidebarLink({ item, pendingReports, onNavigate }) {
  const { to, label, icon: Icon, end, badge } = item;
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => `admin-nav-link${isActive ? " is-active" : ""}`}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      {badge === "reports" && pendingReports > 0 && (
        <span className="admin-nav-badge">{pendingReports > 99 ? "99+" : pendingReports}</span>
      )}
    </NavLink>
  );
}

export default function AdminShell({ children }) {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hasAdminPermission(user, "reports.view")) return undefined;
    let active = true;
    const load = () => {
      fetchAdminReports({ page_size: 1 })
        .then((data) => {
          if (active) setPendingReports(Number(data?.open) || 0);
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user]);

  const activeLabel = useMemo(() => {
    const items = groups.flatMap((group) => group.items);
    const match = items
      .filter((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))
      .sort((a, b) => b.to.length - a.to.length)[0];
    return match?.label || "Console";
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-shell">
        <aside className={`admin-sidebar${menuOpen ? " is-open" : ""}`}>
          <div className="admin-sidebar__brand">
            <Logo to="/admin" />
            <span className="admin-sidebar__tag">Admin</span>
            <button
              type="button"
              className="admin-sidebar__close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="admin-sidebar__identity">
            <span className="admin-sidebar__shield" aria-hidden="true">
              <ShieldCheck size={15} />
            </span>
            <div>
              <strong>{ROLE_LABELS[user?.admin_role] || "Administrator"}</strong>
              <span>Trust &amp; safety console</span>
            </div>
          </div>

          <nav className="admin-nav" aria-label="Admin navigation">
            {groups.map((group) => {
              const items = group.items.filter((item) => hasAdminPermission(user, item.permission));
              if (!items.length) return null;
              return (
                <div key={group.label} className="admin-nav__group">
                  <p className="admin-nav__label">{group.label}</p>
                  {items.map((item) => (
                    <SidebarLink
                      key={item.to}
                      item={item}
                      pendingReports={pendingReports}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  ))}
                </div>
              );
            })}
          </nav>

          <div className="admin-sidebar__footer">
            <Link className="admin-view-site" to="/home">
              <ArrowUpRight size={15} aria-hidden="true" />
              View TickMe
            </Link>
            <div className="admin-account">
              <Avatar
                name={user?.name || user?.username}
                src={user?.avatar_url ? getMediaUrl(user.avatar_url) : ""}
                size={36}
              />
              <div className="admin-account__copy">
                <strong>{user?.name || user?.username}</strong>
                <span>@{user?.username}</span>
              </div>
              <button type="button" onClick={handleLogout} className="btn-icon" aria-label="Log out" title="Log out">
                <LogOut size={16} aria-hidden="true" />
              </button>
            </div>
            <ThemeToggle labeled />
          </div>
        </aside>

        {menuOpen && (
          <button
            type="button"
            className="admin-sidebar__scrim"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <div className="admin-shell__main">
          <header className="admin-topbar">
            <button
              type="button"
              className="admin-topbar__menu"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={19} aria-hidden="true" />
            </button>
            <div className="admin-breadcrumb">
              <span>TickMe</span>
              <span aria-hidden="true">/</span>
              <strong>{activeLabel}</strong>
            </div>
            <div className="admin-topbar__actions">
              <Link to="/home" className="btn btn-outline btn-sm admin-topbar__exit">
                <ArrowUpRight size={15} aria-hidden="true" />
                Exit console
              </Link>
              <ThemeToggle />
              <Link className="admin-topbar__avatar" to={user ? `/profile/${user.username}` : "/login"} aria-label="Your profile">
                <Avatar
                  name={user?.name || user?.username || "You"}
                  src={user?.avatar_url ? getMediaUrl(user.avatar_url) : ""}
                  size={32}
                  rounded
                />
              </Link>
            </div>
          </header>

          <main className="admin-content">{children}</main>
        </div>
      </div>
  );
}
