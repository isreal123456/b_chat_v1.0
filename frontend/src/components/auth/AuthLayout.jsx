import { Link } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";

import Logo from "../brand/Logo";

export default function AuthLayout({ title, subtitle, children, footer, points = [] }) {
  return (
    <main className="auth">
      <aside className="auth__aside">
        <Logo to="/" />
        <div className="auth__aside-quote">
          <span className="eyebrow">TickMe network</span>
          <h2>
            Built for people who <em>ship.</em>
          </h2>
          <p>
            A professional home for developers and designers: real projects, useful feedback, and the
            collaborators who help you finish the work.
          </p>
          <ul className="auth__list">
            {points.map((point) => (
              <li key={point} className="auth__list-item">
                <Check size={15} aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="auth__aside-foot">Connect. Create. Collaborate.</p>
      </aside>

      <section className="auth__main">
        <div className="auth__card">
          <Link className="auth__back" to="/">
            <ArrowLeft size={14} aria-hidden="true" /> Back to home
          </Link>
          <header className="auth__head">
            <h1 className="auth__title">{title}</h1>
            <p className="auth__sub">{subtitle}</p>
          </header>
          {children}
          {footer && <div className="auth__switch">{footer}</div>}
          <p className="auth__legal">
            By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
