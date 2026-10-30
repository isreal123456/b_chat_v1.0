import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RefreshCw, ShieldCheck, Wrench } from "lucide-react";

import Logo from "../../components/brand/Logo";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { fetchPlatformStatus } from "../../lib/admin";
import { getAccessToken } from "../../lib/api";

function destination() {
  return getAccessToken() ? "/home" : "/login";
}

export default function MaintenancePage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("TickMe is getting an upgrade. Please check back soon.");
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let active = true;
    fetchPlatformStatus()
      .then((status) => {
        if (!active || !status) return;
        if (status.maintenance_message) setMessage(status.maintenance_message);
        if (status.maintenance_mode === false) {
          navigate(destination(), { replace: true });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [navigate]);

  const checkAgain = async () => {
    setChecking(true);
    setNote("");
    try {
      const status = await fetchPlatformStatus();
      if (status?.maintenance_message) setMessage(status.maintenance_message);
      if (status?.maintenance_mode === false) {
        navigate(destination(), { replace: true });
        return;
      }
      setNote("Still upgrading — thank you for your patience.");
    } catch {
      setNote("Could not reach TickMe. Check your connection and try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="not-found maintenance-page">
      <div className="maintenance-page__top">
        <Logo to="/" />
        <ThemeToggle labeled />
      </div>

      <span className="maintenance-page__icon" aria-hidden="true">
        <Wrench size={26} />
      </span>
      <p className="eyebrow">Scheduled maintenance</p>
      <h1>TickMe is getting an upgrade</h1>
      <p className="muted">{message}</p>

      <div className="maintenance-page__actions">
        <button type="button" className="btn btn-primary" onClick={checkAgain} disabled={checking}>
          <RefreshCw size={16} aria-hidden="true" className={checking ? "is-spinning" : undefined} />
          {checking ? "Checking…" : "Check again"}
        </button>
        <Link className="btn btn-secondary" to="/admin">
          <ShieldCheck size={16} aria-hidden="true" />
          Admin console
        </Link>
      </div>

      {note && <p className="hint" role="status">{note}</p>}
      <p className="hint">Administrators keep console access while the public app is paused.</p>
    </main>
  );
}
