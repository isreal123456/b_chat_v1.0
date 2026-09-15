export default function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm text-white">{label}</p>

        {hint && (
          <p className="text-xs text-neutral-500 mt-0.5">
            {hint}
          </p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ml-4 ${
          checked ? "bg-yellow-400" : "bg-neutral-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0 w-5 h-5 bg-white rounded-full transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}