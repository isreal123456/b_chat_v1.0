export default function Field({ label, children, hint }) {
  return (
    <div>
      <label className="text-sm text-neutral-300 mb-1.5 block">{label}</label>
      {children}
      {hint && <p className="text-xs text-neutral-500 mt-1.5">{hint}</p>}
    </div>
  );
}
