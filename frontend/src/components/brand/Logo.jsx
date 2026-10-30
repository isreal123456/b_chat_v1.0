import { Link } from "react-router-dom";

export default function Logo({ to = "/", light = false, compact = false }) {
  return (
    <Link className={`brand${light ? " brand--light" : ""}`} to={to} aria-label="TickMe home">
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3,10 8,15 17,5" />
        </svg>
      </span>
      {!compact && (
        <span className="brand__word">
          Tick<em>Me</em>
        </span>
      )}
    </Link>
  );
}
