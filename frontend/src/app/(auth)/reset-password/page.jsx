import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, KeyRound, Lock } from "lucide-react";

import AuthLayout from "../../../components/auth/AuthLayout";
import { useAuth } from "../../../providers/AuthProvider";

const points = [
  "Choose a password with at least 8 characters",
  "Every other reset link stops working",
  "Then sign in with your new password",
];

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { resetPassword } = useAuth();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Passwords need at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords don’t match yet.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, form.password);
      setDone(true);
    } catch (requestError) {
      setError(requestError.message || "Could not reset your password. Request a new link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Set a strong password for your TickMe account."
      points={points}
      footer={
        <>
          Need a new link? <Link to="/forgot-password">Request another</Link>
        </>
      }
    >
      {!token ? (
        <div className="auth-state auth-state--error">
          <span className="auth-state__icon" aria-hidden="true">
            <KeyRound size={26} />
          </span>
          <div>
            <p className="auth-state__title">This link is incomplete</p>
            <p className="auth-state__copy">
              Open the reset link from your email, or request a fresh one.
            </p>
          </div>
        </div>
      ) : done ? (
        <div className="auth-state auth-state--success">
          <span className="auth-state__icon" aria-hidden="true">
            <CheckCircle2 size={26} />
          </span>
          <div>
            <p className="auth-state__title">Password updated</p>
            <p className="auth-state__copy">Sign in with your new password to continue.</p>
          </div>
        </div>
      ) : (
        <>
          {error && <div className="alert alert--error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}

          <form className="auth__form" onSubmit={handleSubmit}>
            <div className="field">
              <label className="label" htmlFor="reset-password">New password</label>
              <div className="input-affix">
                <Lock size={16} aria-hidden="true" />
                <input
                  className="input"
                  type="password"
                  id="reset-password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="reset-confirm">Confirm password</label>
              <div className="input-affix">
                <Lock size={16} aria-hidden="true" />
                <input
                  className="input"
                  type="password"
                  id="reset-confirm"
                  name="confirm"
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" aria-hidden="true" /> Updating…</> : "Update password"}
            </button>
          </form>
        </>
      )}

      {done && (
        <Link className="btn btn-primary btn-lg" to="/login" style={{ marginTop: "1.4rem" }}>
          Go to login
        </Link>
      )}
    </AuthLayout>
  );
}
