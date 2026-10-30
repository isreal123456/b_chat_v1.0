import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "primary",
  busy = false,
  confirmDisabled = false,
  hideCancel = false,
  onConfirm,
  onClose,
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div className="admin-modal" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <div className="admin-modal__card" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
        <header className="admin-modal__head">
          <span className={`admin-modal__icon admin-modal__icon--${tone}`} aria-hidden="true">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h2 id="admin-modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="btn-icon" aria-label="Close dialog">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        {children && <div className="admin-modal__body">{children}</div>}

        <footer className="admin-modal__actions">
          {!hideCancel && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={busy}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className={`btn btn-sm ${tone === "danger" ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
