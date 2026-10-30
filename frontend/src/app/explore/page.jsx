import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MessageSquare, Search, Sparkles, UserCheck, UserPlus, X } from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import Avatar from "../../components/ui/Avatar";
import PostCard from "../../components/feed/PostCard";
import ProjectCard from "../../components/projects/ProjectCard";
import { useAuth } from "../../providers/AuthProvider";
import {
  api,
  fetchFriends,
  fetchProjects,
  fetchSuggestedPeople,
  fetchTrendingPosts,
  fetchTrendingSkills,
  getMediaUrl,
  searchUsers,
} from "../../lib/api";

function suggestionReason(person) {
  if (person.mutual_connections > 0) {
    return `${person.mutual_connections} mutual ${person.mutual_connections === 1 ? "connection" : "connections"}`;
  }
  if (person.shared_skills?.length) {
    return `Shares ${person.shared_skills.slice(0, 2).join(" · ")}`;
  }
  if (person.category === "developer") return "Developer in your network";
  if (person.category === "designer") return "Designer in your network";
  return "New to TickMe";
}

function PersonCard({ person, variant, onAction, onDismiss, onMessage, sending }) {
  return (
    <article className="card card--interactive person-card">
      {variant === "suggestion" && onDismiss && (
        <button
          type="button"
          onClick={() => onDismiss(person.id)}
          aria-label={`Dismiss ${person.name}`}
          className="person-card__dismiss"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}

      <Link to={`/profile/${person.username}`} aria-label={`${person.name || person.username}'s profile`}>
        <Avatar
          name={person.name || person.username}
          src={person.avatar_url ? getMediaUrl(person.avatar_url) : ""}
          size={64}
        />
      </Link>

      <div>
        <Link className="person-card__name" to={`/profile/${person.username}`}>
          {person.name || person.username}
        </Link>
        <p className="person-card__handle">@{person.username}</p>
        {person.headline && <p className="person-card__headline">{person.headline}</p>}
      </div>

      {variant === "suggestion" && (
        <p className="person-card__reason">
          <Sparkles size={12} aria-hidden="true" />
          {suggestionReason(person)}
        </p>
      )}

      <div className="person-card__actions">
        {variant === "friend" ? (
          <>
            <span className="btn btn-secondary btn-sm" style={{ pointerEvents: "none", flex: 1 }}>
              <UserCheck size={14} aria-hidden="true" /> Connected
            </span>
            <button
              type="button"
              onClick={() => onMessage(person.id)}
              aria-label={`Message ${person.name || person.username}`}
              className="btn btn-secondary btn-sm"
            >
              <MessageSquare size={14} aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={sending}
            onClick={() => onAction(person.id)}
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
          >
            <UserPlus size={14} aria-hidden="true" />
            {sending ? "Sending…" : "Connect"}
          </button>
        )}
      </div>
    </article>
  );
}

function ExploreContent({ initialQuery }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [query, setQuery] = useState(initialQuery);
  const [friends, setFriends] = useState([]);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [suggested, setSuggested] = useState([]);
  const [trending, setTrending] = useState([]);
  const [trendingSkills, setTrendingSkills] = useState([]);
  const [freshProjects, setFreshProjects] = useState([]);

  const [peopleResults, setPeopleResults] = useState([]);
  const [projectResults, setProjectResults] = useState([]);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      fetchFriends(),
      api("/friends/requests/sent"),
      fetchSuggestedPeople({ limit: 8 }),
      fetchTrendingPosts({ days: 7, limit: 3 }),
      fetchTrendingSkills({ limit: 8 }),
      fetchProjects({ limit: 4 }),
    ])
      .then(([friendsResult, sentResult, suggestedResult, trendingResult, skillsResult, projectsResult]) => {
        if (!active) return;
        if (friendsResult.status === "fulfilled") setFriends(friendsResult.value);
        if (sentResult.status === "fulfilled") {
          setPendingIds(new Set(sentResult.value.map((request) => request.user.id)));
        }
        if (suggestedResult.status === "fulfilled") setSuggested(suggestedResult.value.items);
        if (trendingResult.status === "fulfilled") setTrending(trendingResult.value.items);
        if (skillsResult.status === "fulfilled") setTrendingSkills(skillsResult.value.items);
        if (projectsResult.status === "fulfilled") setFreshProjects(projectsResult.value.items);

        const failures = [
          friendsResult,
          sentResult,
          suggestedResult,
          trendingResult,
          skillsResult,
          projectsResult,
        ].filter((result) => result.status === "rejected");
        if (failures.length > 0) {
          setError("Some discovery sections could not load. Check that the API is running.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!term) return undefined;

    let active = true;
    const timer = setTimeout(() => {
      setSearching(true);
      Promise.all([searchUsers(term, 8), fetchProjects({ query: term, limit: 6 })])
        .then(([people, projects]) => {
          if (!active) return;
          setPeopleResults(people);
          setProjectResults(projects.items);
        })
        .catch(() => {
          if (active) setError("Could not search right now.");
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const friendIds = useMemo(() => new Set(friends.map((friend) => friend.id)), [friends]);
  const normalizedQuery = query.trim();

  const handleAdd = async (id) => {
    setError("");
    setSendingId(id);
    try {
      await api(`/friends/requests/${id}`, { method: "POST" });
      setSuggested((current) => current.filter((person) => person.id !== id));
      setPeopleResults((current) => current.filter((person) => person.id !== id));
      setPendingIds((current) => new Set(current).add(id));
    } catch (requestError) {
      setError(requestError.message || "Could not send the connection request.");
    } finally {
      setSendingId(null);
    }
  };

  const handleDismiss = (id) => {
    setSuggested((current) => current.filter((person) => person.id !== id));
  };

  const visiblePeopleResults = peopleResults.filter(
    (person) => !friendIds.has(person.id) && !pendingIds.has(person.id)
  );

  return (
    <AppShell title="Explore" subtitle="Discover people and projects">
      <div className="page-enter">
        <header className="page-head">
          <div>
            <p className="eyebrow">Discover</p>
            <h1 className="page-head__title">Explore TickMe</h1>
            <p className="page-head__sub">
              Search developers and designers, browse projects, and catch up on what the
              network is talking about.
            </p>
          </div>
          <span className="badge badge--neutral">
            {friends.length} {friends.length === 1 ? "connection" : "connections"}
          </span>
        </header>

        <div className="feed-toolbar">
          <div className="feed-search">
            <Search size={16} aria-hidden="true" />
            <label htmlFor="explore-search" className="sr-only">Search people, skills, or projects</label>
            <input
              id="explore-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people, skills, or projects…"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="feed-search__clear"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert alert--error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}

        {normalizedQuery ? (
          <>
            <div className="section-label">
              <span>People</span>
              <span>{searching ? "Searching…" : `${visiblePeopleResults.length} found`}</span>
            </div>
            {visiblePeopleResults.length === 0 ? (
              <div className="empty-state">
                <h3>{searching ? "Searching people…" : "No people match"}</h3>
                <p>Try another name, @handle, skill, or headline.</p>
              </div>
            ) : (
              <div className="people-grid">
                {visiblePeopleResults.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    variant="suggestion"
                    onAction={handleAdd}
                    sending={sendingId === person.id}
                  />
                ))}
              </div>
            )}

            <div className="section-label">
              <span>Projects</span>
              <span>{searching ? "Searching…" : `${projectResults.length} found`}</span>
            </div>
            {projectResults.length === 0 ? (
              <div className="empty-state">
                <h3>{searching ? "Searching projects…" : "No projects match"}</h3>
                <p>Try a title, tech stack, or project category.</p>
              </div>
            ) : (
              <div className="projects-grid">
                {projectResults.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {trending.length > 0 && (
              <section aria-label="Trending updates">
                <div className="section-label">
                  <span>Trending updates</span>
                  <span>Last 7 days</span>
                </div>
                <div className="post-list">
                  {trending.map((post) => (
                    <PostCard key={post.feed_id || post.id} post={post} currentUserId={user?.id} />
                  ))}
                </div>
              </section>
            )}

            {trendingSkills.length > 0 && (
              <section aria-label="Trending skills">
                <div className="section-label">
                  <span>Trending skills</span>
                  <span>Across profiles</span>
                </div>
                <div className="chip-row explore-skills">
                  {trendingSkills.map((skill) => (
                    <button
                      key={skill.name}
                      type="button"
                      className="chip chip--sm explore-skill"
                      onClick={() => setQuery(skill.name)}
                    >
                      {skill.name}
                      <span className="explore-skill__count">{skill.count}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="section-label">
              <span>Recommended for you</span>
              <span>Skills & mutual connections</span>
            </div>
            {loading ? (
              <div className="people-grid" aria-hidden="true">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="card person-card">
                    <span className="skeleton" style={{ width: 64, height: 64, borderRadius: 18 }} />
                    <span className="skeleton" style={{ width: "60%", height: 12 }} />
                    <span className="skeleton" style={{ width: "40%", height: 10 }} />
                    <span className="skeleton" style={{ width: "100%", height: 30, borderRadius: 10 }} />
                  </div>
                ))}
              </div>
            ) : suggested.length === 0 ? (
              <div className="empty-state">
                <h3>No suggestions right now</h3>
                <p>Check back as new builders join TickMe.</p>
              </div>
            ) : (
              <div className="people-grid">
                {suggested.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    variant="suggestion"
                    onAction={handleAdd}
                    sending={sendingId === person.id}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
            )}

            {freshProjects.length > 0 && (
              <section aria-label="Fresh projects">
                <div className="section-label">
                  <span>Fresh projects</span>
                  <Link className="section-link" to="/projects">Browse all</Link>
                </div>
                <div className="projects-grid">
                  {freshProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </section>
            )}

            <div className="section-label">
              <span>Your connections</span>
              <span>{friends.length} total</span>
            </div>
            {friends.length === 0 ? (
              <div className="empty-state">
                <h3>No connections yet</h3>
                <p>Send a connection request above to start your network.</p>
              </div>
            ) : (
              <div className="people-grid">
                {friends.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    variant="friend"
                    onMessage={(id) => navigate(`/messages?user=${id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  return <ExploreContent key={initialQuery} initialQuery={initialQuery} />;
}
