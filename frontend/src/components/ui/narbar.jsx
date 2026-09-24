import {
  Home,
  Users,
  MessageCircle,
  Settings,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";

function TopNav({ items = [
    { icon: Home, active: true, link: "/" },
    { icon: Users, active: false, link: "/explore" },
    { icon: MessageCircle, active: false, link: "/messages" },
    { icon: Settings, active: false, link: "/settings" },
  ],
}) {

  return (
    <header className="flex items-center gap-6 px-6 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-neutral-900">
          B
        </div>
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
        {items.map(({ icon: Icon, active, link }, i) => (
          <Link
            key={i}
            to={link}
            className={`p-2 rounded-full transition-colors ${
              active
                ? "bg-yellow-400 text-neutral-900"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Icon size={18} />
          </Link>
        ))}
      </nav>

      {/* Right spacer */}
      <div className="w-9 h-9 shrink-0" />
    </header>
  );
}

export default TopNav;