import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, Compass, MessageCircle, Sparkles, UsersRound } from "lucide-react";
import { getAccessToken } from "../../lib/api";

const highlights = [
  {
    icon: UsersRound,
    title: "Find your people",
    description: "Meet curious minds, follow what they’re making, and build your own corner of the community.",
  },
  {
    icon: MessageCircle,
    title: "Keep the conversation going",
    description: "Share a thought, leave a thoughtful reply, and stay close to the people who matter.",
  },
  {
    icon: Compass,
    title: "Explore beyond your feed",
    description: "Discover new voices and ideas through a space designed for connection, not noise.",
  },
];

export default function LandingPage() {
  const signedIn = Boolean(getAccessToken());

  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="Bchat home">
          <span className="landing-mark">b</span>
          <span>bchat</span>
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#features">What you can do</a>
          {signedIn ? (
            <Link className="landing-nav-cta" to="/home">Open your feed <ArrowRight size={16} /></Link>
          ) : (
            <>
              <Link className="landing-login" to="/login">Log in</Link>
              <Link className="landing-nav-cta" to="/register">Join bchat <ArrowRight size={16} /></Link>
            </>
          )}
        </nav>
      </header>

      <section className="landing-hero" id="about">
        <div className="landing-copy">
          <span className="landing-eyebrow"><Sparkles size={15} /> A little more human</span>
          <h1>Good things happen when we <em>find each other.</em></h1>
          <p className="landing-lede">
            Bchat is a place to share what’s on your mind, discover new perspectives, and make room for better conversations.
          </p>
          <div className="landing-actions">
            <Link className="landing-primary" to={signedIn ? "/home" : "/register"}>
              {signedIn ? "Go to your feed" : "Find your people"} <ArrowRight size={18} />
            </Link>
            {!signedIn && <Link className="landing-secondary" to="/login">I already have an account</Link>}
          </div>
          <a className="landing-scroll" href="#features"><ArrowDown size={15} /> Take a look around</a>
        </div>

        <div className="landing-art" aria-label="A preview of the Bchat community">
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />
          <div className="landing-spark landing-spark-one">✳</div>
          <div className="landing-spark landing-spark-two">✦</div>
          <article className="landing-note landing-note-main">
            <div className="landing-note-top">
              <span className="landing-avatar landing-avatar-blue">J</span>
              <span><strong>Jordan Lee</strong><small>@jordansays</small></span>
              <span className="landing-note-dot">···</span>
            </div>
            <p>Made something small today. It reminded me that progress is still progress. 🌱</p>
            <div className="landing-note-footer"><span>♡ &nbsp; 24</span><span>↩ &nbsp; 8 replies</span></div>
          </article>
          <article className="landing-note landing-note-float">
            <span className="landing-avatar landing-avatar-coral">M</span>
            <span><strong>Mina Park</strong><small>just joined the conversation</small></span>
            <span className="landing-float-heart">✦</span>
          </article>
          <div className="landing-art-caption">A space for the things worth sharing.</div>
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">Make yourself at home</span>
          <h2>Connection, with room to breathe.</h2>
          <p>Less pressure to perform. More space to be part of something.</p>
        </div>
        <div className="landing-feature-grid">
          {highlights.map(({ icon: Icon, title, description }, index) => (
            <article className="landing-feature" key={title}>
              <span className={`landing-feature-icon landing-feature-icon-${index + 1}`}><Icon size={20} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand" to="/"><span className="landing-mark">b</span><span>bchat</span></Link>
        <span>A good place to start a conversation.</span>
        <Link to={signedIn ? "/home" : "/register"}>{signedIn ? "Visit your feed" : "Come on in"} <ArrowRight size={15} /></Link>
      </footer>
    </main>
  );
}
