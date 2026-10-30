import { Navigate, Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import Logo from "../brand/Logo";
import { useAuth } from "../../providers/AuthProvider";
import { hasAdminPermission } from "../../lib/admin";
import { AdminToastProvider } from "./ToastProvider";

export default function AdminGuard({ permission, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="admin-guard-state" role="status">
        <span className="spinner" aria-hidden="true" />
        <span>Verifying administrator access…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.admin_role) {
    return (
      <main className="admin-denied">
        <Logo to="/home" />
        <span className="admin-denied__icon" aria-hidden="true">
          <ShieldAlert size={26} />
        </span>
        <p className="admin-eyebrow">403 · Restricted</p>
        <h1>This area is for the TickMe team.</h1>
        <p>Your account does not have administrator access. If you believe this is a mistake, contact a Super Admin.</p>
        <Link className="btn btn-primary" to="/home">Back to TickMe</Link>
      </main>
    );
  }

  if (permission && !hasAdminPermission(user, permission)) {
    return (
      <main className="admin-denied">
        <Logo to="/admin" />
        <span className="admin-denied__icon" aria-hidden="true">
          <ShieldAlert size={26} />
        </span>
        <p className="admin-eyebrow">403 · Insufficient permission</p>
        <h1>Your role cannot open this view.</h1>
        <p>Your <strong>{user.admin_role.replace("_", " ")}</strong> role does not include the <code>{permission}</code> permission.</p>
        <Link className="btn btn-primary" to="/admin">Return to the dashboard</Link>
      </main>
    );
  }

  return <AdminToastProvider>{children}</AdminToastProvider>;
}
