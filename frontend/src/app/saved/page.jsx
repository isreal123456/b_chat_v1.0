import { useCallback, useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { Link } from "react-router-dom";

import AppShell from "../../components/layout/AppShell";
import PostCard from "../../components/feed/PostCard";
import { fetchSavedPosts } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";

const PAGE_SIZE = 10;

export default function SavedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetchSavedPosts({ limit: PAGE_SIZE, offset: 0 })
      .then((data) => {
        if (!active) return;
        setPosts(data.items || []);
        setTotal(data.total || 0);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load your saved posts.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    setError("");
    try {
      const data = await fetchSavedPosts({ limit: PAGE_SIZE, offset: posts.length });
      setPosts((current) => [...current, ...(data.items || [])]);
      setTotal(data.total || 0);
    } catch (requestError) {
      setError(requestError.message || "Could not load more saved posts.");
    } finally {
      setLoadingMore(false);
    }
  }, [posts.length]);

  const hasMore = posts.length < total;

  return (
    <AppShell title="Saved" subtitle="Kept for later">
      <div className="page-enter">
        <header className="page-head">
          <div>
            <p className="eyebrow">Bookmarks</p>
            <h1 className="page-head__title">Saved posts</h1>
            <p className="page-head__sub">References, inspiration, and threads you want to return to.</p>
          </div>
          <span className="badge badge--accent badge--dot">{total} saved</span>
        </header>

        {error && <div className="alert alert--error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}

        {loading ? (
          <div className="post-list" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="card post-card">
                <div className="row" style={{ gap: "0.7rem" }}>
                  <span className="skeleton" style={{ width: 44, height: 44, borderRadius: 14 }} />
                  <div style={{ flex: 1, display: "grid", gap: "0.35rem" }}>
                    <span className="skeleton" style={{ width: "35%", height: 12 }} />
                    <span className="skeleton" style={{ width: "22%", height: 10 }} />
                  </div>
                </div>
                <span className="skeleton" style={{ height: 12, width: "90%" }} />
                <span className="skeleton" style={{ height: 12, width: "64%" }} />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true">
              <Bookmark size={20} />
            </span>
            <h3>Nothing saved yet</h3>
            <p>Tap Save on any post to keep it here for later.</p>
            <Link className="btn btn-primary btn-sm" to="/home">
              Browse your feed
            </Link>
          </div>
        ) : (
          <>
            <div className="post-list">
              {posts.map((post) => (
                <PostCard key={post.feed_id || post.id} post={post} currentUserId={user?.id} />
              ))}
            </div>

            {hasMore && (
              <div className="feed-more">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading more…" : `Load more (${total - posts.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
