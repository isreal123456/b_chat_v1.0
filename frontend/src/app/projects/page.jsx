import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FolderPlus, Handshake, Search, X } from "lucide-react";

import AppShell from "../../components/layout/AppShell";
import ProjectCard from "../../components/projects/ProjectCard";
import { fetchProjects } from "../../lib/api";
import { PROJECT_CATEGORIES, PROJECT_STATUSES } from "../../lib/projects";

const PAGE_SIZE = 12;

export default function ProjectsPage() {
  const [searchParams] = useSearchParams();
  const username = searchParams.get("username") || "";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      fetchProjects({ query, category, status, username, limit: PAGE_SIZE, offset: 0 })
        .then((data) => {
          if (!active) return;
          setItems(data.items || []);
          setTotal(data.total || 0);
        })
        .catch((requestError) => {
          if (active) setError(requestError.message || "Could not load projects.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, query ? 260 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, category, status, username]);

  const loadMore = async () => {
    setLoadingMore(true);
    setError("");
    try {
      const data = await fetchProjects({
        query,
        category,
        status,
        username,
        limit: PAGE_SIZE,
        offset: items.length,
      });
      setItems((current) => [...current, ...(data.items || [])]);
      setTotal(data.total || 0);
    } catch (requestError) {
      setError(requestError.message || "Could not load more projects.");
    } finally {
      setLoadingMore(false);
    }
  };

  const heading = username ? `Projects by @${username}` : "Project showcase";

  return (
    <AppShell title="Projects" subtitle="Ship in public">
      <div className="page-enter">
        <header className="page-head">
          <div>
            <p className="eyebrow">Showcase</p>
            <h1 className="page-head__title">{heading}</h1>
            <p className="page-head__sub">
              Real work from developers and designers, from early prototypes to shipped products.
            </p>
          </div>
          <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
            <Link className="btn btn-secondary btn-sm" to="/collaboration-requests">
              <Handshake size={15} aria-hidden="true" />
              Requests
            </Link>
            <Link className="btn btn-primary btn-sm" to="/projects/new">
              <FolderPlus size={15} aria-hidden="true" />
              New project
            </Link>
          </div>
        </header>

        <div className="projects-toolbar">
          <div className="feed-search">
            <Search size={16} aria-hidden="true" />
            <label htmlFor="project-search" className="sr-only">Search projects</label>
            <input
              id="project-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects, tools, or tags"
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

          <label className="projects-toolbar__status">
            <span className="sr-only">Filter by status</span>
            <select
              className="input"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">Any status</option>
              {PROJECT_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="filter-chips" role="group" aria-label="Filter by category">
          {PROJECT_CATEGORIES.map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              className={`filter-chip${category === option.value ? " is-active" : ""}`}
              aria-pressed={category === option.value}
              onClick={() => setCategory(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error && <div className="alert alert--error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}

        <div className="section-label">
          <span>Projects</span>
          <span>{loading ? "Loading…" : `${total} total`}</span>
        </div>

        {loading ? (
          <div className="projects-grid" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="project-card project-card--skeleton">
                <span className="skeleton" style={{ height: 150, borderRadius: 0 }} />
                <div className="project-card__body">
                  <span className="skeleton" style={{ width: "40%", height: 12 }} />
                  <span className="skeleton" style={{ width: "80%", height: 16 }} />
                  <span className="skeleton" style={{ width: "60%", height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>{query ? "No projects match that search" : "No projects here yet"}</h3>
            <p>
              {query || category || status
                ? "Try another keyword or clear the filters."
                : "Be the first to show what you are building."}
            </p>
            {query || category || status ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                  setStatus("");
                }}
              >
                Clear filters
              </button>
            ) : (
              <Link className="btn btn-primary btn-sm" to="/projects/new">
                Publish a project
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="projects-grid">
              {items.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
            {items.length < total && (
              <div className="projects-more">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading…" : "Load more projects"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
