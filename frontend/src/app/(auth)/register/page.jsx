import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AtSign, Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import AuthLayout from "../../../components/auth/AuthLayout";
import { useAuth } from "../../../providers/AuthProvider";

const points = [
  "Create a portfolio-style professional profile",
  "Publish projects with screenshots and stack details",
  "Get matched with developers and designers for Build Together",
];

export default function RegisterPage() {
  const { register, login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={user?.onboarded ? "/home" : "/onboarding"} replace />;
  }

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const username = form.username.trim();
    const email = form.email.trim();

    if (!name || !username || !email || !form.password) {
      setError("Fill in every field to create your account.");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      setError("Usernames use 3–30 letters, numbers, or underscores.");
      return;
    }
    if (form.password.length < 8) {
      setError("Passwords need at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords don’t match yet.");
      return;
    }
    if (!accepted) {
      setError("Accept the Terms of Service and Privacy Policy to create your account.");
      return;
    }

    setLoading(true);
    try {
      await register({ username, name, email, password: form.password, terms_accepted: true });
      try {
        const me = await login(email, form.password);
        navigate(me?.onboarded ? "/home" : "/onboarding", { replace: true });
      } catch {
        navigate("/login", {
          replace: true,
          state: { notice: "Account created. Log in to continue." },
        });
      }
    } catch (requestError) {
      setError(requestError.message || "Could not create your account. Try a different email or username.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Your next collaborator is already here."
      points={points}
      footer={
        <>
          Already on TickMe? <Link to="/login">Log in</Link>
        </>
      }
    >
      {error && <div className="alert alert--error" role="alert" style={{ marginBottom: "1rem" }}>{error}</div>}

      <form className="auth__form" onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="register-name">Full name</label>
          <div className="input-affix">
            <User size={16} aria-hidden="true" />
            <input
              className="input"
              type="text"
              id="register-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ada Lovelace"
              autoComplete="name"
            />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="register-username">Username</label>
          <div className="input-affix">
            <AtSign size={16} aria-hidden="true" />
            <input
              className="input"
              type="text"
              id="register-username"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="ada"
              autoComplete="username"
            />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="register-email">Email</label>
          <div className="input-affix">
            <Mail size={16} aria-hidden="true" />
            <input
              className="input"
              type="email"
              id="register-email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="register-password">Password</label>
          <div className="input-affix input-affix--action">
            <Lock size={16} aria-hidden="true" />
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              id="register-password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              autoComplete="new-password"
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

        <div className="field">
          <label className="label" htmlFor="register-confirm">Confirm password</label>
          <div className="input-affix">
            <Lock size={16} aria-hidden="true" />
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              id="register-confirm"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="auth__consent">
          <input
            type="checkbox"
            id="register-terms"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <label htmlFor="register-terms">
            I agree to the{" "}
            <Link to="/terms" target="_blank" rel="noreferrer">Terms of Service</Link> and{" "}
            <Link to="/privacy" target="_blank" rel="noreferrer">Privacy Policy</Link>.
          </label>
        </div>

        <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
          {loading ? <><span className="spinner" aria-hidden="true" /> Creating account…</> : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
