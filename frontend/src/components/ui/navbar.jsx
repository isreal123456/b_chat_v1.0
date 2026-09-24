import {
  Home,
  Users,
  MessageCircle,
  Settings,
  Search,
  Bell,
  LogOut,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

function TopNav({
  items = [
    { icon: Home, link: "/" },
    { icon: Users, link: "/explore" },
    { icon: MessageCircle, link: "/messages" },
    { icon: Bell, link: "/friend-requests" },
    { icon: Settings, link: "/settings" },
  ],
}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login", { replace: true });
  };

  return (
    <header className="app-navbar flex items-center gap-6 px-6 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="app-navbar__logo w-9 h-9 rounded-xl bg-yellow-400 flex items-center justify-center font-bold text-neutral-900">
          B
        </div>
        <span className="hidden sm:block text-sm font-bold tracking-tight text-white">bchat</span>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
        />

        <input
          type="text"
          placeholder="#Explore"
          className="w-full bg-neutral-800 text-neutral-300 placeholder-neutral-500 rounded-full pl-9 pr-4 py-2 text-sm border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-5 mx-auto">
        {items.map(({ icon: Icon, link }, i) => (
          <NavLink
            key={i}
            to={link}
            className={({ isActive }) =>
              `p-2 rounded-full transition-colors ${
                isActive
                  ? "bg-yellow-400 text-neutral-900"
                  : "text-neutral-400 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        aria-label="Log out"
        title="Log out"
        className="p-2 rounded-full shrink-0 text-neutral-400 hover:text-white transition-colors"
      >
        <LogOut size={18} />
      </button>
    </header>
  );
}

export default TopNav;