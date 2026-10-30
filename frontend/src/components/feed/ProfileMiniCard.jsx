import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import Avatar from "../ui/Avatar";
import { getMediaUrl } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";

export default function ProfileMiniCard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <section className="card profile-mini" aria-label="Your profile">
      <div className="profile-mini__top">
        <Avatar
          name={user.name || user.username}
          src={user.avatar_url ? getMediaUrl(user.avatar_url) : ""}
          size={44}
        />
        <div className="profile-mini__copy">
          <p className="profile-mini__name">{user.name || user.username}</p>
          <p className="profile-mini__handle">@{user.username}</p>
        </div>
      </div>
      <p className="muted" style={{ marginTop: "0.7rem", fontSize: "0.8rem", lineHeight: 1.55 }}>
        {user.bio || "Add a short bio so people know what you build."}
      </p>
      <Link className="profile-mini__link" to={`/profile/${user.username}`}>
        View profile <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}
