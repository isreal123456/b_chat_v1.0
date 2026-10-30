export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="admin-page-head">
      <div>
        {eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="admin-page-head__desc">{description}</p>}
      </div>
      {actions && <div className="admin-page-head__actions">{actions}</div>}
    </header>
  );
}

export function SectionPanel({ title, description, action, children, className = "" }) {
  return (
    <section className={`admin-panel${className ? ` ${className}` : ""}`}>
      {(title || action) && (
        <header className="admin-panel__head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "default", trend }) {
  return (
    <article className={`admin-stat admin-stat--${tone}`}>
      <div className="admin-stat__top">
        <span className="admin-stat__label">{label}</span>
        {Icon && (
          <span className="admin-stat__icon" aria-hidden="true">
            <Icon size={17} />
          </span>
        )}
      </div>
      <p className="admin-stat__value">{value}</p>
      <div className="admin-stat__foot">
        {hint && <span>{hint}</span>}
        {trend && <span className="admin-stat__trend">{trend}</span>}
      </div>
    </article>
  );
}

export function InlineState({ message = "Loading…", error = false }) {
  return (
    <div className={`admin-inline-state${error ? " admin-inline-state--error" : ""}`} role={error ? "alert" : "status"}>
      {!error && <span className="spinner" aria-hidden="true" />}
      <span>{message}</span>
    </div>
  );
}
