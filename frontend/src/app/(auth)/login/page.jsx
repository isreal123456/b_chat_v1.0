import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

import AuthLayout from "../../../components/auth/AuthLayout";
import { useAuth } from "../../../providers/AuthProvider";

const points = [
  "Professional profiles with skills, stack, and links",
  "Project showcase with repo and demo links",
  "Build Together requests for finding collaborators",
];

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = location.state?.notice;
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={user?.onboarded ? "/home" : "/onboarding"} replace />;
  }

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Enter your email and password to continue.");
      return;
    }

    setLoading(true);
    try {
      const me = await login(form.email.trim(), form.password);
      navigate(me?.onboarded ? "/home" : "/onboarding", { replace: true });
    } catch (requestError) {
      setError(requestError.message || "Could not sign you in. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to pick up where you left off."
      points={points}
      footer={
        <>
          New to TickMe? <Link to="/register">Create an account</Link>
        </>
      }
    >
      {notice && <div className="alert alert--success" role="status" style={{ marginBottom: "1rem" }}>{notice}</div>}
      {error && <div className="alert alert--error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}

      <form className="auth__form" onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="login-email">Email</label>
          <div className="input-affix">
            <Mail size={16} aria-hidden="true" />
            <input
              className="input"
              type="email"
              id="login-email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="login-password">Password</label>
          <div className="input-affix input-affix--action">
            <Lock size={16} aria-hidden="true" />
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              id="login-password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="input-affix__action"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="auth__row">
          <Link to="/forgot-password">Forgot password?</Link>
          <span>Use the email linked to your account.</span>
        </div>

        <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
          {loading ? <><span className="spinner" aria-hidden="true" /> Signing in…</> : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}
