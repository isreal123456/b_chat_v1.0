export default function SectionCard({ title, description, children }) {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6">
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      {description && <p className="text-sm text-neutral-500 mb-5">{description}</p>}
      {children}
    </div>
  );
}
