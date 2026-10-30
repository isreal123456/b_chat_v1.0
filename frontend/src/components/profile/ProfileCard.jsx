import { Briefcase, CalendarDays, Check, Clock, Code2, Flag, Globe, MapPin, MessageCircle, Pencil, Sparkles, UserCheck, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import Avatar from "../ui/Avatar";
import { getMediaUrl } from "../../lib/api";
import { categoryLabel } from "../../lib/profile";

export default function ProfileCard({
  user,
  isOwnProfile,
  connection,
  onConnect,
  requesting,
  postCount = 0,
  followerCount = 0,
  followingCount = 0,
  isFollowing = false,
  onToggleFollow,
  followPending = false,
  onReport,
}) {
  const skills = Array.isArray(user.skills) ? user.skills : [];
  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "";
  const category = categoryLabel(user.category);

  return (
    <article className="profile-hero">
      <div className="profile-hero__cover" />
      <div className="profile-hero__body">
        <div className="profile-hero__row">
          <Avatar
            name={user.name || user.username}
            src={user.avatar_url ? getMediaUrl(user.avatar_url) : ""}
            size={96}
            className="profile-hero__avatar"
          />

          <div className="profile-hero__actions">
            {isOwnProfile ? (
              <Link className="btn btn-secondary btn-sm" to="/settings">
                <Pencil size={15} aria-hidden="true" />
                Edit profile
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  className={`btn btn-sm ${isFollowing ? "btn-secondary" : "btn-primary"}`}
                  onClick={onToggleFollow}
                  disabled={followPending}
                  aria-pressed={isFollowing}
                >
                  {isFollowing ? <UserCheck size={15} aria-hidden="true" /> : <UserPlus size={15} aria-hidden="true" />}
                  {followPending ? "Saving…" : isFollowing ? "Following" : "Follow"}
                </button>
                {connection === "connected" && (
                  <Link className="btn btn-secondary btn-sm" to={`/messages?user=${user.id}`}>
                    <MessageCircle size={15} aria-hidden="true" />
                    Message
                  </Link>
                )}
                {connection === "none" && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={onConnect} disabled={requesting}>
                    <UserPlus size={15} aria-hidden="true" />
                    {requesting ? "Sending…" : "Connect"}
                  </button>
                )}
                {connection === "pending" && (
                  <span className="badge badge--neutral">
                    <Clock size={13} aria-hidden="true" />
                    Request pending
                  </span>
                )}
                {connection === "incoming" && (
                  <Link className="btn btn-primary btn-sm" to="/friend-requests">
                    <UserPlus size={15} aria-hidden="true" />
                    Respond to request
                  </Link>
                )}
                {connection === "connected" && (
                  <span className="badge badge--accent">
                    <Check size={13} aria-hidden="true" />
                    Connected
                  </span>
                )}
                {onReport && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onReport}
                    title={`Report @${user.username}`}
                  >
                    <Flag size={15} aria-hidden="true" />
                    Report
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <h1 className="profile-hero__name">
          {user.name || user.username}
          {category && <span className="badge badge--accent">{category}</span>}
        </h1>
        <p className="profile-hero__handle">@{user.username}</p>

        <div className="profile-hero__stats">
          <span>
            <strong>{followerCount}</strong>
            {followerCount === 1 ? "follower" : "followers"}
          </span>
          <span>
            <strong>{followingCount}</strong>
            following
          </span>
          <span>
            <strong>{postCount}</strong>
            {postCount === 1 ? "post" : "posts"}
          </span>
        </div>

        {user.headline && <p className="profile-hero__headline">{user.headline}</p>}
        {user.bio && <p className="profile-hero__bio">{user.bio}</p>}

        {skills.length > 0 && (
          <div className="chip-row profile-hero__skills">
            {skills.map((skill) => (
              <span key={skill} className="chip">{skill}</span>
            ))}
          </div>
        )}

        <div className="profile-hero__meta">
          {user.location && (
            <span>
              <MapPin size={14} aria-hidden="true" />
              {user.location}
            </span>
          )}
          {joined && (
            <span>
              <CalendarDays size={14} aria-hidden="true" />
              Joined {joined}
            </span>
          )}
          {user.available_for_work && (
            <span className="profile-hero__availability">
              <Sparkles size={14} aria-hidden="true" />
              Open to work
            </span>
          )}
          {user.github_url && (
            <a className="profile-hero__meta-link" href={user.github_url} target="_blank" rel="noreferrer">
              <Code2 size={14} aria-hidden="true" />
              GitHub
            </a>
          )}
          {user.portfolio_url && (
            <a className="profile-hero__meta-link" href={user.portfolio_url} target="_blank" rel="noreferrer">
              <Globe size={14} aria-hidden="true" />
              Portfolio
            </a>
          )}
          {user.linkedin_url && (
            <a className="profile-hero__meta-link" href={user.linkedin_url} target="_blank" rel="noreferrer">
              <Briefcase size={14} aria-hidden="true" />
              LinkedIn
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
