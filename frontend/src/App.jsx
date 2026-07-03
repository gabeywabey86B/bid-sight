import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { supabase } from "./lib/supabase";
import AuthPage from "./pages/AuthPage";
import TrainingPage from "./pages/TrainingPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProgressPage from "./pages/ProgressPage";
import "./App.css";

function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <p className="center-msg">Loading...</p>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function Layout({ children }) {
  const { session } = useAuth();
  return (
    <div className="app-shell">
      {session && (
        <nav className="navbar">
          <span className="brand">BidSight</span>
          <NavLink to="/training">Training</NavLink>
          <NavLink to="/progress">Progress</NavLink>
          <NavLink to="/leaderboard">Leaderboard</NavLink>
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
