export default function SectionCard({ title, description, children }) {
  return (
    <section className="card settings-card">
      <h2 className="settings-card__title">{title}</h2>
      {description && <p className="settings-card__desc">{description}</p>}
      {children}
    </section>
  );
}
