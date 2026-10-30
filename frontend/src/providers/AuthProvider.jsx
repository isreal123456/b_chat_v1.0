/* eslint-disable react-refresh/only-export-components -- provider modules intentionally co-locate their context hook */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getAccessToken } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getAccessToken()));

  const loadUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const me = await api("/users/me");
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) return undefined;
    let active = true;
    api("/users/me")
      .then((me) => {
        if (active) setUser(me);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email, password) => {
      const body = new URLSearchParams({ username: email, password });
      const data = await api("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      localStorage.setItem("access_token", data.access_token);
      setLoading(true);
      const me = await loadUser();
      if (!me) throw new Error("We signed you in but could not load your profile. Please try again.");
      return me;
    },
    [loadUser],
  );

  const register = useCallback(async (payload) => {
    return api("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }, []);

  const verifyEmail = useCallback(async (token) => {
    const data = await api("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    setUser((current) => (current ? { ...current, email_verified: true } : current));
    return data;
  }, []);

  const resendVerification = useCallback(async () => {
    return api("/auth/resend-verification", { method: "POST" });
  }, []);

  const forgotPassword = useCallback(async (email) => {
    return api("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    return api("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    setUser(null);
  }, []);

  const updateUser = useCallback((partial) => {
    setUser((current) => (current ? { ...current, ...partial } : current));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refresh: loadUser,
      updateUser,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      loadUser,
      updateUser,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
