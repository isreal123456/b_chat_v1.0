import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getMediaUrl } from "../../lib/api";

export default function ProfileSidebarCard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api("/users/me").then(setUser).catch(() => setUser(null));
  }, []);

  const name = user?.name || user?.username || "Your profile";
  const username = user?.username || "user";

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 text-center">
      <div className="relative w-24 h-24 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-yellow-400/30" />
        <img
          src={user?.avatar_url ? getMediaUrl(user.avatar_url) : `https://i.pravatar.cc/200?u=${username}`}
          alt={name}
          className="w-24 h-24 rounded-2xl object-cover mx-auto"
        />
      </div>

      <h2 className="text-white font-semibold">{name}</h2>
      <p className="text-neutral-500 text-sm mb-3">@{username}</p>

      <p className="text-neutral-300 text-sm mb-4">
        {user ? "Connect with people and share what you are building." : "Loading your profile..."}
      </p>

      <Link
        to={`/profile/${username}`}
        className="block w-full bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded-lg py-2 transition-colors"
      >
        My Profile
      </Link>
    </div>
  );
}
