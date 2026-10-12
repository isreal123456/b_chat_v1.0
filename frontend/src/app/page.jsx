import TopNav from "../components/ui/navbar";
import ProfileSidebarCard from "../components/home/ProfileSidebarCard";
import PostComposer from "../components/home/PostComposer";
import PostCard from "../components/home/PostCard";
import ActivityCard from "../components/home/ActivityCard";
import { usePosts } from "../hooks/usePosts";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Search, X } from "lucide-react";

export default function HomePage() {
  const { posts, loading, error, addPost } = usePosts();
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    api("/users/me")
      .then((user) => setCurrentUserId(user.id))
      .catch(() => setCurrentUserId(null));
    api("/friends/requests/received")
      .then((requests) => {
        setActivityError("");
        setActivity(requests.map((request) => ({
        id: request.id,
        name: request.user?.name || request.user?.username || "Someone",
        action: "sent you a friend request",
        })));
      })
      .catch((requestError) => setActivityError(requestError.message || "Could not load recent activity."))
      .finally(() => setActivityLoading(false));
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

  return (
    <div className="min-h-screen bg-neutral-900">
      <TopNav />

      <div className="home-layout mx-auto grid grid-cols-1 gap-6 px-6 pb-10">
        <section className="feed-support" aria-labelledby="feed-support-title">
          <div className="feed-support-heading">
            <div>
              <p className="feed-eyebrow">YOUR CORNER</p>
              <h2 id="feed-support-title">People and updates</h2>
            </div>
            <p>Keep your profile close and your connections up to date.</p>
          </div>
          <div className="feed-support-grid">
            <ProfileSidebarCard />
            <ActivityCard activity={activity} loading={activityLoading} loadError={activityError} onRequestHandled={removeActivity} />
          </div>
        </section>

        <main className="home-feed space-y-6">
          <PostComposer onPostCreated={addPost} />
          <div className="feed-search">
            <Search size={18} aria-hidden="true" className="shrink-0 text-neutral-500" />
            <label htmlFor="feed-search" className="sr-only">Search posts by text or author</label>
            <input
              id="feed-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search posts or people..."
              autoComplete="off"
            />
            {searchTerm && (
              <button type="button" onClick={() => setSearchTerm("")} aria-label="Clear feed search" title="Clear search">
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </div>
          {!loading && !error && normalizedSearch && (
            <p className="feed-search-count" aria-live="polite">
              {visiblePosts.length} {visiblePosts.length === 1 ? "post" : "posts"} matching “{searchTerm.trim()}”
            </p>
          )}
          <div className="feed-post-list">
            {loading && (
              <div className="feed-state feed-state-loading rounded-2xl border border-neutral-800 bg-neutral-850 p-6 text-sm text-neutral-400 animate-pulse">
                Loading your feed...
              </div>
            )}
            {error && (
              <div className="feed-state feed-state-error rounded-2xl border border-red-900/60 bg-red-950/30 p-6">
                <p className="text-sm font-semibold text-red-200">We could not load your feed.</p>
                <p className="mt-1 text-sm text-red-300/70">
                  {error.message || "Check that you are signed in and the API is running."}
                </p>
              </div>
            )}
            {!loading && !error && posts.length === 0 && (
              <div className="feed-state feed-state-empty rounded-2xl border border-dashed border-neutral-700 bg-neutral-800/50 p-8 text-center">
                <p className="text-white font-semibold">Your feed is quiet</p>
                <p className="mt-1 text-sm text-neutral-400">Share something or follow people to get the conversation started.</p>
              </div>
            )}
            {!loading && !error && posts.length > 0 && visiblePosts.length === 0 && (
              <div className="feed-state feed-state-empty rounded-2xl border border-dashed border-neutral-700 bg-neutral-800/50 p-8 text-center">
                <p className="text-white font-semibold">No matching posts</p>
                <p className="mt-1 text-sm text-neutral-400">Try another name or phrase.</p>
              </div>
            )}
            {!loading && !error && visiblePosts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={currentUserId} />
            ))}
          </div>
        </main>

      </div>
    </div>
  );
}
