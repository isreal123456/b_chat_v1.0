import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, UserRound } from "lucide-react";
import { api, getMediaUrl } from "../../lib/api";

export default function ProfileSidebarCard() {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api("/users/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoaded(true));
  }, []);

  const name = user?.name || user?.username || "Your profile";
  const username = user?.username || "user";

  return (
    <section className="feed-profile-card" aria-labelledby="feed-profile-title">
      <div className="feed-panel-kicker">
        <span className="feed-panel-icon"><UserRound size={17} aria-hidden="true" /></span>
        <span className="feed-panel-label">YOUR PROFILE</span>
      </div>
      <div className="feed-profile-main">
        <img
          src={user?.avatar_url ? getMediaUrl(user.avatar_url) : "/avatar-placeholder.svg"}
          onError={(event) => { event.currentTarget.src = "/avatar-placeholder.svg"; }}
          alt=""
          className="feed-profile-avatar"
        />
        <div className="feed-profile-copy">
          <h3 id="feed-profile-title">{name}</h3>
          <p>@{username}</p>
          {!loaded && <span role="status">Loading profile…</span>}
          {loaded && !user && <span className="feed-profile-note">Profile details unavailable</span>}
        </div>
        <Link to={`/profile/${username}`} className="feed-profile-link">
          View profile <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
