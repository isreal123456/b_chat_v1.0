import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

import AuthLayout from "../../../components/auth/AuthLayout";
import { useAuth } from "../../../providers/AuthProvider";
import { toAppPath } from "../../../lib/api";

const points = [
  "Request a secure, single-use reset link",
  "Links expire after 30 minutes",
  "Your password is never sent by email",
];

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Enter the email address linked to your account.");
      return;
    }

    setLoading(true);
    try {
      const result = await forgotPassword(email.trim());
      setSent(result);
    } catch (requestError) {
      setError(requestError.message || "Could not send the reset link. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we will send a link to choose a new password."
      points={points}
      footer={
        <>
          Remembered it? <Link to="/login">Back to login</Link>
        </>
      }
    >
      {error && <div className="alert alert--error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}

      {sent ? (
        <div className="auth-state auth-state--success">
          <span className="auth-state__icon" aria-hidden="true">
            <Mail size={26} />
          </span>
          <div>
            <p className="auth-state__title">Check your inbox</p>
            <p className="auth-state__copy">{sent.message}</p>
            {sent.reset_url && (
              <p className="auth__note" style={{ marginTop: "0.6rem" }}>
                Development mode: <Link to={toAppPath(sent.reset_url)}>open the reset link</Link>
              </p>
            )}
          </div>
        </div>
      ) : (
        <form className="auth__form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="forgot-email">Email</label>
            <div className="input-affix">
              <Mail size={16} aria-hidden="true" />
              <input
                className="input"
                type="email"
                id="forgot-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" aria-hidden="true" /> Sending…</> : "Send reset link"}
          </button>

          <p className="auth__note">
            For security, we show the same confirmation whether or not an account exists.
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
