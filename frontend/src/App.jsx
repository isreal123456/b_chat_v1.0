import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import HomePage from "./app/page.jsx";
import ExplorePage from "./app/explore/page.jsx";
import MessagesPage from "./app/messages/page.jsx";
import SettingsPage from "./app/settings/page.jsx";
import FriendRequestsPage from "./app/friend-requests/page.jsx";
import ProfilePage from "./app/profile/[username]/page.jsx";
import NotificationsPage from "./app/notifications/page.jsx";
import LandingPage from "./app/landing/page.jsx";

import LoginPage from "./app/(auth)/login/page.jsx";
import RegisterPage from "./app/(auth)/register/page.jsx";
import AuthPage from "./app/auth/page.jsx";
import PasswordResetPage from "./app/(auth)/password-reset/page.jsx";
import { getAccessToken } from "./lib/api";

function ProtectedRoute({ children }) {
  return getAccessToken() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root entry */}
        <Route path="/" element={<LandingPage />} />

        {/* Home */}
        <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />

        {/* Explore */}
        <Route path="/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />

        {/* Messages */}
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

        {/* Settings */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/friend-requests" element={<ProtectedRoute><FriendRequestsPage /></ProtectedRoute>} />

        {/* Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<PasswordResetPage />} />
        <Route path="/reset-password" element={<PasswordResetPage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Profile */}
        <Route
          path="/profile/:username"
          element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <main className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-5xl font-bold">404</h1>

                <p className="mt-2">
                  Page not found.
                </p>

                <button
                  onClick={() => {
                    window.location.href = "/home";
                  }}
                  className="mt-5 px-5 py-2 bg-black text-white rounded-lg"
                >
                  Go Home
                </button>
              </div>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
