import { BrowserRouter, Navigate, Routes, Route, Link } from "react-router-dom";

import HomePage from "./app/page.jsx";
import ExplorePage from "./app/explore/page.jsx";
import MessagesPage from "./app/messages/page.jsx";
import SettingsPage from "./app/settings/page.jsx";
import FriendRequestsPage from "./app/friend-requests/page.jsx";
import CollaborationRequestsPage from "./app/collaboration-requests/page.jsx";
import SavedPage from "./app/saved/page.jsx";
import ProfilePage from "./app/profile/[username]/page.jsx";
import ProjectsPage from "./app/projects/page.jsx";
import NewProjectPage from "./app/projects/new/page.jsx";
import ProjectDetailPage from "./app/projects/[id]/page.jsx";
import EditProjectPage from "./app/projects/[id]/edit/page.jsx";
import NotificationsPage from "./app/notifications/page.jsx";
import LandingPage from "./app/landing/page.jsx";
import MaintenancePage from "./app/maintenance/page.jsx";
import TermsPage from "./app/terms/page.jsx";
import PrivacyPage from "./app/privacy/page.jsx";

import AdminGuard from "./components/admin/AdminGuard";
import AdminOverviewPage from "./app/admin/page.jsx";
import AdminAnalyticsPage from "./app/admin/analytics/page.jsx";
import AdminUsersPage from "./app/admin/users/page.jsx";
import AdminUserDetailPage from "./app/admin/users/[id]/page.jsx";
import AdminPostsPage from "./app/admin/content/posts/page.jsx";
import AdminPostDetailPage from "./app/admin/content/posts/[id]/page.jsx";
import AdminCommentsPage from "./app/admin/content/comments/page.jsx";
import AdminReportsPage from "./app/admin/reports/page.jsx";
import AdminReportDetailPage from "./app/admin/reports/[id]/page.jsx";
import AdminProjectsPage from "./app/admin/projects/page.jsx";
import AdminProjectDetailPage from "./app/admin/projects/[id]/page.jsx";
import AdminSettingsPage from "./app/admin/settings/page.jsx";
import AdminActivityPage from "./app/admin/activity/page.jsx";

import LoginPage from "./app/(auth)/login/page.jsx";
import RegisterPage from "./app/(auth)/register/page.jsx";
import ForgotPasswordPage from "./app/(auth)/forgot-password/page.jsx";
import ResetPasswordPage from "./app/(auth)/reset-password/page.jsx";
import VerifyEmailPage from "./app/(auth)/verify-email/page.jsx";
import OnboardingPage from "./app/onboarding/page.jsx";
import AuthPage from "./app/auth/page.jsx";
import { useAuth } from "./providers/AuthProvider";
import Logo from "./components/brand/Logo";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="route-loading" role="status">
        <span className="spinner" aria-hidden="true" />
        <span>Loading your workspace…</span>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function NotFoundPage() {
  return (
    <main className="not-found">
      <Logo to="/" />
      <p className="eyebrow">404 · Off the grid</p>
      <h1>This page hasn’t shipped yet.</h1>
      <p className="muted">The link may be outdated, or the page moved somewhere else.</p>
      <Link className="btn btn-primary" to="/home">Back to your feed</Link>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root entry */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Home */}
        <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />

        {/* Explore */}
        <Route path="/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />

        {/* Projects */}
        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
        <Route path="/projects/new" element={<ProtectedRoute><NewProjectPage /></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
        <Route path="/projects/:id/edit" element={<ProtectedRoute><EditProjectPage /></ProtectedRoute>} />

        {/* Messages */}
        <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

        {/* Settings */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/friend-requests" element={<ProtectedRoute><FriendRequestsPage /></ProtectedRoute>} />
        <Route path="/collaboration-requests" element={<ProtectedRoute><CollaborationRequestsPage /></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute><SavedPage /></ProtectedRoute>} />

        {/* Onboarding */}
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

        {/* Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Profile */}
        <Route
          path="/profile/:username"
          element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
        />

        {/* Admin console */}
        <Route path="/admin" element={<AdminGuard permission="dashboard.view"><AdminOverviewPage /></AdminGuard>} />
        <Route path="/admin/analytics" element={<AdminGuard permission="analytics.view"><AdminAnalyticsPage /></AdminGuard>} />
        <Route path="/admin/users" element={<AdminGuard permission="users.view"><AdminUsersPage /></AdminGuard>} />
        <Route path="/admin/users/:id" element={<AdminGuard permission="users.view"><AdminUserDetailPage /></AdminGuard>} />
        <Route path="/admin/content/posts" element={<AdminGuard permission="content.view"><AdminPostsPage /></AdminGuard>} />
        <Route path="/admin/content/posts/:id" element={<AdminGuard permission="content.view"><AdminPostDetailPage /></AdminGuard>} />
        <Route path="/admin/content/comments" element={<AdminGuard permission="content.view"><AdminCommentsPage /></AdminGuard>} />
        <Route path="/admin/reports" element={<AdminGuard permission="reports.view"><AdminReportsPage /></AdminGuard>} />
        <Route path="/admin/reports/:id" element={<AdminGuard permission="reports.view"><AdminReportDetailPage /></AdminGuard>} />
        <Route path="/admin/projects" element={<AdminGuard permission="projects.view"><AdminProjectsPage /></AdminGuard>} />
        <Route path="/admin/projects/:id" element={<AdminGuard permission="projects.view"><AdminProjectDetailPage /></AdminGuard>} />
        <Route path="/admin/settings" element={<AdminGuard permission="settings.view"><AdminSettingsPage /></AdminGuard>} />
        <Route path="/admin/activity" element={<AdminGuard permission="activity.view"><AdminActivityPage /></AdminGuard>} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
