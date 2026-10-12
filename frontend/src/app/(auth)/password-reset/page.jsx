import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../../lib/api";

export default function PasswordResetPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (token && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const result = token
        ? await api("/auth/password-reset/confirm", {
            method: "POST",
            body: JSON.stringify({ token, password }),
          })
        : await api("/auth/password-reset/request", {
            method: "POST",
            body: JSON.stringify({ email }),
          });
      setMessage(result.message);
      if (token) {
        setPassword("");
        setConfirmation("");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-neutral-900 px-4 py-8">
      <section className="w-full max-w-md bg-neutral-800 rounded-2xl shadow-xl p-8 border border-neutral-700">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center mb-3">
            <span className="text-neutral-900 font-bold text-xl">B</span>
          </div>
          <h1 className="text-white text-2xl font-semibold">
            {token ? "Choose a new password" : "Reset your password"}
          </h1>
          <p className="text-neutral-400 text-sm mt-2 text-center">
            {token ? "Choose a new password for your account." : "Enter your account email and we’ll send you a reset link."}
          </p>
        </div>

        {error && <p role="alert" className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2">{error}</p>}
        {message && <p role="status" className="mb-4 text-sm text-green-300 bg-green-400/10 border border-green-400/30 rounded-lg px-3 py-2">{message}</p>}

        {!message || token ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {token ? (
              <>
                <label className="text-sm text-neutral-300 block">
                  New password
                  <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full bg-neutral-900 text-white rounded-lg px-4 py-2.5 border border-neutral-700" />
                </label>
                <label className="text-sm text-neutral-300 block">
                  Confirm new password
                  <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full bg-neutral-900 text-white rounded-lg px-4 py-2.5 border border-neutral-700" />
                </label>
              </>
            ) : (
              <label className="text-sm text-neutral-300 block">
                Email
                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1 w-full bg-neutral-900 text-white rounded-lg px-4 py-2.5 border border-neutral-700" />
              </label>
            )}
            <button type="submit" disabled={loading} className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-neutral-900 font-semibold rounded-lg py-2.5 transition-colors">
              {loading ? "Please wait…" : token ? "Update password" : "Send reset link"}
            </button>
          </form>
        ) : null}

        <p className="text-center text-sm text-neutral-400 mt-6">
          <Link to="/login" className="text-yellow-400 hover:underline">Back to log in</Link>
        </p>
      </section>
    </main>
  );
}
