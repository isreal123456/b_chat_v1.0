import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./app/page.jsx";
import ExplorePage from "./app/explore/page.jsx";
import MessagesPage from "./app/messages/page.jsx";
import SettingsPage from "./app/settings/page.jsx";
import ProfilePage from "./app/profile/[username]/page.jsx";

import LoginPage from "./app/(auth)/login/page.jsx";
import RegisterPage from "./app/(auth)/register/page.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<HomePage />} />

        {/* Explore */}
        <Route path="/explore" element={<ExplorePage />} />

        {/* Messages */}
        <Route path="/messages" element={<MessagesPage />} />

        {/* Settings */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Profile */}
        <Route
          path="/profile/:username"
          element={<ProfilePage />}
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
                    window.location.href = "/";
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