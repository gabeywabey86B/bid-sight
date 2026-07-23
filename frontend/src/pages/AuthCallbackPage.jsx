import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

function getAuthErrorFromUrl() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    search.get("error_description") ||
    search.get("error") ||
    hash.get("error_description") ||
    hash.get("error")
  );
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { session, loading, profileError } = useAuth();
  const [exchangeComplete, setExchangeComplete] = useState(false);
  const [error, setError] = useState(() => getAuthErrorFromUrl());

  useEffect(() => {
    let cancelled = false;

    async function exchangeCode() {
      const urlError = getAuthErrorFromUrl();
      if (urlError) {
        setError(urlError);
        return;
      }

      const search = new URLSearchParams(window.location.search);
      if (!search.get("code")) {
        if (!cancelled) setExchangeComplete(true);
        return;
      }

      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );
        if (exchangeError) throw exchangeError;
        if (!cancelled) setExchangeComplete(true);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    exchangeCode();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (error || !exchangeComplete || loading) return;
    if (profileError) {
      setError(profileError);
      return;
    }
    if (session) {
      navigate("/training", { replace: true });
      return;
    }
    setError("No active session was created from the Google callback.");
  }, [error, exchangeComplete, loading, navigate, profileError, session]);

  return (
    <div className="auth-page">
      <h1>BidSight</h1>
      {!error ? (
        <>
          <p className="tagline">Finishing sign in...</p>
          <p>Completing your Google login and loading your profile.</p>
        </>
      ) : (
        <>
          <p className="tagline">Could not finish sign in</p>
          <p className="error">{error}</p>
          <Link to="/login" className="btn-primary">
            Back to log in
          </Link>
        </>
      )}
    </div>
  );
}
