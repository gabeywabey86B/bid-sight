import { useState } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "check-email"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const name = displayName || email.split("@")[0];
        const { available } = await api.checkName(name);
        if (!available) {
          setError("That name is taken");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (!data.session && data.user?.identities?.length > 0) {
          setMode("check-email");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  if (mode === "check-email") {
    return (
      <div className="auth-page">
        <h1>BidSight</h1>
        <p className="tagline">Check your inbox</p>
        <p>
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your
          account.
        </p>
        <button className="link-button" onClick={() => setMode("login")}>
          Back to log in
        </button>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>BidSight</h1>
      <p className="tagline">Train your BOSS bid-guessing skills.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "..." : mode === "signup" ? "Sign up" : "Log in"}
        </button>
      </form>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <button className="btn-ghost btn-google" onClick={handleGoogle}>
        Continue with Google
      </button>

      <button
        className="link-button"
        onClick={() => setMode(mode === "signup" ? "login" : "signup")}
      >
        {mode === "signup" ? "Already have an account? Log in" : "New here? Sign up"}
      </button>
    </div>
  );
}
