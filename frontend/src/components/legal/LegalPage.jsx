import { Link } from "react-router-dom";

import Logo from "../brand/Logo";
import ThemeToggle from "../ui/ThemeToggle";
import { LEGAL_CONTACT, LEGAL_EFFECTIVE_DATE, LEGAL_VERSION } from "../../lib/legal";

export default function LegalPage({ eyebrow, title, intro, sections }) {
  return (
    <main className="legal">
      <header className="legal__bar">
        <Logo to="/" />
        <div className="legal__bar-actions">
          <ThemeToggle />
          <Link className="btn btn-ghost btn-sm" to="/">Back to TickMe</Link>
        </div>
      </header>

      <article className="legal__article">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="legal__title">{title}</h1>
        <p className="legal__meta">
          Version {LEGAL_VERSION} · Effective {LEGAL_EFFECTIVE_DATE}
        </p>
        <p className="legal__lede">{intro}</p>

        <nav className="legal__toc" aria-label="On this page">
          {sections.map((section, index) => (
            <a key={section.id} href={`#${section.id}`}>
              {index + 1}. {section.title}
            </a>
          ))}
        </nav>

        <div className="legal__body">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="legal__section">
              <h2>{index + 1}. {section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="legal__section" id="contact">
            <h2>Contact</h2>
            <p>
              Questions about this document can be sent to{" "}
              <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>. We aim to respond within
              five business days.
            </p>
          </section>
        </div>
      </article>

      <footer className="legal__footer">
        <span>Connect. Create. Collaborate.</span>
        <nav className="legal__footer-links" aria-label="Legal">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </nav>
      </footer>
    </main>
  );
}
