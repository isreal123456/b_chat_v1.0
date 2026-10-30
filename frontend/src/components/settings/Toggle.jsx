export default function Toggle({ checked, onChange, label, hint, disabled = false }) {
  return (
    <div className="settings-row">
      <div>
        <p className="settings-row__label">{label}</p>
        {hint && <p className="settings-row__hint">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="toggle"
      >
        <span className="toggle__thumb" />
      </button>
    </div>
  );
}
