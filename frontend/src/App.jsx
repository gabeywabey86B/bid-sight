import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { ThemeProvider, useTheme } from "./lib/ThemeContext";
import { supabase } from "./lib/supabase";
import AuthPage from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import TrainingPage from "./pages/TrainingPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProgressPage from "./pages/ProgressPage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import LivePage from "./pages/LivePage";
import AdminPage from "./pages/AdminPage";
import LoadingScreen from "./components/LoadingScreen";
import "./App.css";

function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { session, loading, isAdmin, profileLoading } = useAuth();
  if (loading || profileLoading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/training" replace />;
  return children;
}

function Layout({ children }) {
<<<<<<< HEAD
  const { session, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
=======
  const { session, isAdmin, profileError } = useAuth();
>>>>>>> feature/google-authentication
  return (
    <div className="app-shell">
      {session && (
        <nav className="navbar">
          <Link to="/training" className="brand">BidSight</Link>
          <NavLink to="/training">Training</NavLink>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/progress">Progress</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          <NavLink to="/live">Live</NavLink>
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
          <div className="navbar-spacer"></div>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle dark mode">
            {theme === 'dark' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <button className="link-button" onClick={() => supabase.auth.signOut()}>
            Log out
          </button>
        </nav>
      )}
      {session && profileError && <p className="auth-warning">{profileError}</p>}
      <main>{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { session, loading } = useAuth();

  return (
    <Layout>
      <Routes>
        <Route
          path="/login"
          element={loading ? null : session ? <Navigate to="/training" replace /> : <AuthPage />}
        />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/training"
          element={
            <RequireAuth>
              <TrainingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/search"
          element={
            <RequireAuth>
              <SearchPage />
            </RequireAuth>
          }
        />
        <Route
          path="/progress"
          element={
            <RequireAuth>
              <ProgressPage />
            </RequireAuth>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <RequireAuth>
              <LeaderboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/live"
          element={
            <RequireAuth>
              <LivePage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Navigate to="/training" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
