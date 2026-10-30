import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import AppShell from "../../../components/layout/AppShell";
import ProfileCard from "../../../components/profile/ProfileCard";
import PostCard from "../../../components/feed/PostCard";
import ProjectCard from "../../../components/projects/ProjectCard";
import ReportDialog from "../../../components/reports/ReportDialog";
import {
  api,
  fetchFriends,
  fetchProfile,
  fetchUserPosts,
  fetchUserProjects,
  followUser,
  unfollowUser,
} from "../../../lib/api";
import { useAuth } from "../../../providers/AuthProvider";

function resolveConnection({ meId, personId, friends, sent, received }) {
  if (meId === personId) return "self";
  if (friends.some((friend) => friend.id === personId)) return "connected";
  if (sent.some((request) => request.user?.id === personId)) return "pending";
  if (received.some((request) => request.user?.id === personId)) return "incoming";
  return "none";
}

function ProfileView({ username }) {
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postTotal, setPostTotal] = useState(0);
  const [connection, setConnection] = useState("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [projects, setProjects] = useState([]);
  const [projectTotal, setProjectTotal] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      fetchProfile(username),
      fetchUserPosts(username, { limit: 20 }),
      fetchFriends(),
      api("/friends/requests/sent"),
      api("/friends/requests/received"),
      fetchUserProjects(username, { limit: 6 }),
    ]).then(([profileResult, postsResult, friendsResult, sentResult, receivedResult, projectsResult]) => {
      if (!active) return;

      if (profileResult.status === "rejected") {
        setError(profileResult.reason?.message || "Could not load this profile.");
        setLoading(false);
        return;
      }

      const person = profileResult.value;
      setProfile(person);
      setIsFollowing(Boolean(person.is_following));
      setFollowerCount(person.follower_count ?? 0);
      setFollowingCount(person.following_count ?? 0);

      if (postsResult.status === "fulfilled") {
        setPosts(postsResult.value.items || []);
        setPostTotal(postsResult.value.total ?? (postsResult.value.items || []).length);
      }

      if (projectsResult.status === "fulfilled") {
        setProjects(projectsResult.value.items || []);
        setProjectTotal(projectsResult.value.total || 0);
      }

      setConnection(
        resolveConnection({
          meId: me?.id,
          personId: person.id,
          friends: friendsResult.status === "fulfilled" ? friendsResult.value || [] : [],
          sent: sentResult.status === "fulfilled" ? sentResult.value || [] : [],
          received: receivedResult.status === "fulfilled" ? receivedResult.value || [] : [],
        }),
      );
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [username, me?.id]);

  const handleConnect = async () => {
    setActionError("");
    setRequesting(true);
    try {
      await api(`/friends/requests/${profile.id}`, { method: "POST" });
      setConnection("pending");
    } catch (requestError) {
      setActionError(requestError.message || "Could not send a connection request.");
    } finally {
      setRequesting(false);
    }
  };

  const handleToggleFollow = async () => {
    setActionError("");
    setFollowPending(true);
    try {
      const result = isFollowing ? await unfollowUser(profile.id) : await followUser(profile.id);
      setIsFollowing(Boolean(result.following));
      setFollowerCount(result.follower_count ?? followerCount);
    } catch (followError) {
      setActionError(followError.message || "Could not update follow.");
    } finally {
      setFollowPending(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Profile">
        <div className="stack" style={{ gap: "1rem" }}>
          <div className="card skeleton" style={{ height: 272 }} />
          <div className="card skeleton" style={{ height: 168 }} />
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell title="Profile">
        <div className="empty-state">
          <h3>Profile not found</h3>
          <p>{error || "This person may have changed their username."}</p>
          <Link className="btn btn-secondary btn-sm" to="/explore">
            Explore people
          </Link>
        </div>
      </AppShell>
    );
  }

  const isOwnProfile = connection === "self";

  return (
    <AppShell title={profile.name || profile.username} subtitle={`@${profile.username}`}>
      <div className="profile-page">
        <ProfileCard
          user={profile}
          isOwnProfile={isOwnProfile}
          connection={connection}
          onConnect={handleConnect}
          requesting={requesting}
          postCount={postTotal}
          followerCount={followerCount}
          followingCount={followingCount}
          isFollowing={isFollowing}
          onToggleFollow={handleToggleFollow}
          followPending={followPending}
          onReport={me && profile.id !== me.id ? () => setReportOpen(true) : undefined}
        />

        {actionError && (
          <p role="alert" className="alert alert--error">
            {actionError}
          </p>
        )}

        <div className="profile-section-head">
          <h2>{isOwnProfile ? "Your projects" : "Projects"}</h2>
          <div className="profile-section-head__actions">
            {isOwnProfile && (
              <Link className="btn btn-secondary btn-sm" to="/projects/new">New project</Link>
            )}
            {projects.length > 0 && (isOwnProfile || projectTotal > 6) && (
              <Link className="muted" to={`/projects?username=${encodeURIComponent(profile.username)}`}>
                View all{projectTotal > 0 ? ` (${projectTotal})` : ""}
              </Link>
            )}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>
              {isOwnProfile
                ? "Publish something you are building to show up here."
                : `${profile.name || profile.username} hasn't shared a project yet.`}
            </p>
            {isOwnProfile && (
              <Link className="btn btn-primary btn-sm" to="/projects/new">
                Publish a project
              </Link>
            )}
          </div>
        ) : (
          <div className="projects-grid projects-grid--compact">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} showOwner={false} />
            ))}
          </div>
        )}

        <div className="profile-section-head">
          <h2>{isOwnProfile ? "Your posts" : "Posts"}</h2>
          <span className="muted mono">{postTotal}</span>
        </div>

        {posts.length === 0 ? (
          <div className="empty-state">
            <h3>No posts yet</h3>
            <p>
              {isOwnProfile
                ? "Share your first update from the home feed."
                : `${profile.name || profile.username} hasn't posted anything yet.`}
            </p>
            {isOwnProfile && (
              <Link className="btn btn-primary btn-sm" to="/home#compose">
                Share an update
              </Link>
            )}
          </div>
        ) : (
          <div className="stack" style={{ gap: "1rem" }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={me?.id} />
            ))}
          </div>
        )}

        {reportOpen && (
          <ReportDialog
            targetType="user"
            targetId={profile.id}
            targetLabel={`${profile.name || profile.username} (@${profile.username})`}
            onClose={() => setReportOpen(false)}
          />
        )}
      </div>
    </AppShell>
  );
}

export default function ProfilePage() {
  const { username = "" } = useParams();
  return <ProfileView key={username} username={username} />;
}
