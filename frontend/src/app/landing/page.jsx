import { Link } from "react-router-dom";
import { ArrowRight, GitBranch, Layers, Sparkles, UsersRound } from "lucide-react";

import Logo from "../../components/brand/Logo";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { useAuth } from "../../providers/AuthProvider";

const highlights = [
  {
    icon: Layers,
    title: "A profile that proves your craft",
    description:
      "Show your role, stack, skills, and shipped work. TickMe profiles read like a portfolio, not a résumé.",
  },
  {
    icon: GitBranch,
    title: "Projects, not just posts",
    description:
      "Publish what you’re building with screenshots, repo and demo links, and the stack behind it. Collect feedback where the work lives.",
  },
  {
    icon: UsersRound,
    title: "Find your build crew",
    description:
      "Post an idea, list the skills you need, and connect with developers and designers who want to build it with you.",
  },
];

const steps = [
  { label: "01", title: "Set up your identity", copy: "Add your title, skills, and links. Pick developer or designer." },
  { label: "02", title: "Ship something public", copy: "Share an update or publish a project with its stack and links." },
  { label: "03", title: "Build together", copy: "Find collaborators, send a request, and start a private thread." },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const primaryHref = isAuthenticated ? "/home" : "/register";
  const primaryLabel = isAuthenticated ? "Open your feed" : "Join TickMe";

  return (
    <main className="landing">
      <header className="landing__nav">
        <Logo to="/" />
        <nav className="landing__links" aria-label="Main">
          <a className="landing__link" href="#why">Why TickMe</a>
          <a className="landing__link" href="#how">How it works</a>
        </nav>
        <div className="landing__nav-actions">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link className="btn btn-primary btn-sm" to="/home">
              Open your feed <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm hide-sm" to="/login">Log in</Link>
              <Link className="btn btn-primary btn-sm" to="/register">
                Join TickMe <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="landing__hero" id="why">
        <div className="landing__copy">
          <span className="eyebrow">
            <Sparkles size={13} aria-hidden="true" /> Connect. Create. Collaborate.
          </span>
          <h1 className="landing__title">
            Where builders find their <em>crew.</em>
          </h1>
          <p className="landing__lede">
            TickMe is the professional network for developers and designers. Share what you’re shipping,
            publish real projects, and meet the people you want to build the next thing with.
          </p>
          <div className="landing__cta">
            <Link className="btn btn-primary btn-lg" to={primaryHref}>
              {primaryLabel} <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a className="btn btn-outline btn-lg" href="#how">See how it works</a>
          </div>
          <div className="landing__meta">
            <div className="landing__stat">
              <strong>Profiles</strong>
              <span>Built for builders</span>
            </div>
            <div className="landing__stat">
              <strong>Projects</strong>
              <span>Show the real work</span>
            </div>
            <div className="landing__stat">
              <strong>Teams</strong>
              <span>Formed around ideas</span>
            </div>
          </div>
        </div>

        <div className="landing__art" aria-label="A preview of a TickMe profile and project card">
          <div className="landing__window">
            <div className="landing__window-bar" aria-hidden="true">
              <i /> <i /> <i />
              <span className="landing__window-file">builder.ts</span>
            </div>
            <pre className="landing__window-body">
<span className="tok-com">{"// your TickMe identity"}</span>{"\n"}
<span className="tok-key">const</span> builder = {"{"}
{"\n  "}name: <span className="tok-str">"You"</span>,
{"\n  "}role: <span className="tok-str">"Full-stack developer"</span>,
{"\n  "}stack: [<span className="tok-str">"React"</span>, <span className="tok-str">"FastAPI"</span>, <span className="tok-str">"Postgres"</span>],
{"\n  "}openTo: <span className="tok-str">"Build Together"</span>,
{"\n  "}ship: <span className="tok-fn">() =&gt;</span> <span className="tok-key">true</span>,
{"\n"}{"}"};
            </pre>
          </div>

          <div className="landing__float landing__float--profile">
            <Logo to="/" compact />
            <div>
              <p className="landing__float-name">Your profile, upgraded</p>
              <p className="landing__float-role">role · stack · projects · links</p>
            </div>
          </div>

          <div className="landing__float landing__float--tick">
            <strong>✓ Ticks</strong>
            <span>Signal, not noise</span>
          </div>
        </div>
      </section>

      <section className="landing__section" aria-labelledby="why-title">
        <div className="landing__section-head">
          <div>
            <span className="eyebrow">Why TickMe</span>
            <h2 id="why-title">Built for the way makers actually work.</h2>
          </div>
          <p>Social networking for people who care about the craft — with room for the work itself.</p>
        </div>
        <div className="landing__grid">
          {highlights.map(({ icon: Icon, title, description }) => (
            <article className="landing-feature" key={title}>
              <span className="landing-feature__icon" aria-hidden="true">
                <Icon size={19} />
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing__section" id="how" aria-labelledby="how-title">
        <div className="landing__section-head">
          <div>
            <span className="eyebrow">How it works</span>
            <h2 id="how-title">Three steps from hello to shipped.</h2>
          </div>
          <p>No algorithm games. Build a profile worth sharing, then share what you build.</p>
        </div>
        <div className="landing__grid">
          {steps.map((step) => (
            <article className="landing-feature" key={step.label}>
              <span className="eyebrow" style={{ color: "var(--accent-text)" }}>{step.label}</span>
              <h3 style={{ marginTop: "0.6rem" }}>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing__footer">
        <div className="landing__footer-inner">
          <Logo to="/" />
          <span>Connect. Create. Collaborate.</span>
          <nav className="landing__footer-links" aria-label="Legal">
            <Link className="landing__link" to="/terms">Terms</Link>
            <Link className="landing__link" to="/privacy">Privacy</Link>
          </nav>
          <Link className="landing__link" to={primaryHref}>
            {isAuthenticated ? "Visit your feed" : "Get started"}
          </Link>
        </div>
      </footer>
    </main>
  );
}
