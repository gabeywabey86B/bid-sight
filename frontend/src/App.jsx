import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { supabase } from "./lib/supabase";
import AuthPage from "./pages/AuthPage";
import TrainingPage from "./pages/TrainingPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProgressPage from "./pages/ProgressPage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import LivePage from "./pages/LivePage";
import AdminPage from "./pages/AdminPage";
import "./App.css";

function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <p className="center-msg">Loading...</p>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { session, loading, isAdmin, profileLoading } = useAuth();
  if (loading || profileLoading) return <p className="center-msg">Loading...</p>;
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/training" replace />;
  return children;
}

function Layout({ children }) {
  const { session, isAdmin } = useAuth();
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
          <button className="link-button" onClick={() => supabase.auth.signOut()}>
            Log out
          </button>
        </nav>
      )}
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
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
