"use client";

import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.username || !form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      // Replace with your actual auth call, e.g. lib/auth.js -> signup()
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Could not create account.");
      }

      // redirect on success, e.g. router.push("/login")
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-900 px-4 py-10">
      <div className="w-full max-w-md bg-neutral-800 rounded-2xl shadow-xl p-8 border border-neutral-700">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center mb-3">
            <span className="text-neutral-900 font-bold text-xl">B</span>
          </div>
          <h1 className="text-white text-2xl font-semibold">Create account</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Join and start sharing your thoughts
          </p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name */}
          <div>
            <label className="text-sm text-neutral-300 mb-1 block">
              Full name
            </label>
            <div className="relative">
              <User
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Elviz Dizzouza"
                className="w-full bg-neutral-900 text-white placeholder-neutral-500 rounded-lg pl-10 pr-4 py-2.5 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="text-sm text-neutral-300 mb-1 block">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                @
              </span>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="elvizoodem"
                className="w-full bg-neutral-900 text-white placeholder-neutral-500 rounded-lg pl-8 pr-4 py-2.5 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm text-neutral-300 mb-1 block">
              Email
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full bg-neutral-900 text-white placeholder-neutral-500 rounded-lg pl-10 pr-4 py-2.5 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-neutral-300 mb-1 block">
              Password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                className="w-full bg-neutral-900 text-white placeholder-neutral-500 rounded-lg pl-10 pr-10 py-2.5 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <p className="text-xs text-neutral-500">
            By signing up, you agree to our{" "}
            <a href="/terms" className="text-yellow-400 hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-yellow-400 hover:underline">
              Privacy Policy
            </a>
            .
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-neutral-900 font-semibold rounded-lg py-2.5 transition-colors"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-400 mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-yellow-400 hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}