import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import AppShell from "../components/layout/AppShell";
import PostComposer from "../components/feed/PostComposer";
import PostCard from "../components/feed/PostCard";
import ActivityCard from "../components/feed/ActivityCard";
import ProfileMiniCard from "../components/feed/ProfileMiniCard";
import { usePosts } from "../hooks/usePosts";
import { api, fetchProject } from "../lib/api";
import { useAuth } from "../providers/AuthProvider";

function FeedSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="card post-card" aria-hidden="true">
          <div className="row" style={{ gap: "0.7rem" }}>
            <span className="skeleton" style={{ width: 44, height: 44, borderRadius: 14 }} />
            <div style={{ flex: 1, display: "grid", gap: "0.35rem" }}>
              <span className="skeleton" style={{ width: "35%", height: 12 }} />
              <span className="skeleton" style={{ width: "22%", height: 10 }} />
            </div>
          </div>
          <span className="skeleton" style={{ height: 12, width: "92%" }} />
          <span className="skeleton" style={{ height: 12, width: "74%" }} />
          <span className="skeleton" style={{ height: 12, width: "48%" }} />
        </div>
      ))}
    </>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { posts, total, loading, loadingMore, error, hasMore, loadMore, addPost } = usePosts();
  const [searchParams] = useSearchParams();
  const [attachedProject, setAttachedProject] = useState(null);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const projectParam = searchParams.get("project");

  useEffect(() => {
    const projectId = Number(projectParam);
    if (!projectParam || !Number.isInteger(projectId) || projectId <= 0) return undefined;

    let active = true;
    fetchProject(projectId)
      .then((project) => {
        if (active) setAttachedProject(project?.is_owner ? project : null);
      })
      .catch(() => {
        if (active) setAttachedProject(null);
      });
    return () => {
      active = false;
    };
  }, [projectParam]);

  useEffect(() => {
    let active = true;
    api("/friends/requests/received")
      .then((requests) => {
        if (!active) return;
        setActivityError("");
        setActivity(
          requests.map((request) => ({
            id: request.id,
            name: request.user?.name || request.user?.username || "Someone",
          })),
        );
      })
      .catch((requestError) => {
        if (active) setActivityError(requestError.message || "Could not load recent activity.");
      })
      .finally(() => {
        if (active) setActivityLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const removeActivity = (requestId) => {
    setActivity((current) => current.filter((item) => item.id !== requestId));
  };

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const visiblePosts = normalizedSearch
    ? posts.filter((post) =>
        [post.content, post.author, post.username]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(normalizedSearch)),
      )
    : posts;

  const rail = (
    <div className="rail-stack">
      <ProfileMiniCard />
      <ActivityCard
        activity={activity}
        loading={activityLoading}
        loadError={activityError}
        onRequestHandled={removeActivity}
      />
      <aside className="rail-note">
        <strong>How your feed is ranked</strong>
        <span>
          Ticks, comments, and freshness set the pace. Posts from people you follow get a lift, and your
          skills, project categories, and past engagement tune the rest.
        </span>
      </aside>
    </div>
  );

  return (
    <AppShell title="Home" subtitle="Your feed" right={rail}>
      <div className="page-enter">
        <header className="page-head">
          <div>
            <p className="eyebrow">Home feed</p>
            <h1 className="page-head__title">What builders are shipping</h1>
            <p className="page-head__sub">Updates, questions, and wins from your network.</p>
          </div>
          <span className="badge badge--accent badge--dot">{total} posts</span>
        </header>

        <PostComposer onPostCreated={addPost} project={attachedProject} />

        <div className="feed-toolbar">
          <div className="feed-search">
            <Search size={16} aria-hidden="true" />
            <label htmlFor="feed-search" className="sr-only">Search posts by text or author</label>
            <input
              id="feed-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search this feed…"
              autoComplete="off"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear feed search"
                className="feed-search__clear"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {!loading && !error && normalizedSearch && (
          <p className="feed-count" aria-live="polite">
            {visiblePosts.length} {visiblePosts.length === 1 ? "post" : "posts"} matching “{searchTerm.trim()}”
          </p>
        )}

        <div className="post-list">
          {loading && <FeedSkeleton />}

          {error && (
            <div className="alert alert--error" role="alert">
              <div>
                <strong>We couldn’t load your feed.</strong>
                <p style={{ marginTop: 2 }}>{error.message || "Check that the API is running and try again."}</p>
              </div>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="empty-state">
              <span className="empty-state__icon" aria-hidden="true">✓</span>
              <h3>Your feed is quiet</h3>
              <p>Share your first update or connect with people in Explore to get the conversation started.</p>
            </div>
          )}

          {!loading && !error && posts.length > 0 && visiblePosts.length === 0 && (
            <div className="empty-state">
              <h3>No matching posts</h3>
              <p>Try another word, name, or @handle.</p>
            </div>
          )}

          {!loading &&
            !error &&
            visiblePosts.map((post) => (
              <PostCard key={post.feed_id || post.id} post={post} currentUserId={user?.id} />
            ))}

          {!loading && !error && !normalizedSearch && hasMore && (
            <div className="feed-more">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading more…" : `Load more posts (${total - posts.length})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
