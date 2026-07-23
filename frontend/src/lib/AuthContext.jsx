import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setSessionReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!alive) return;
      setSession(newSession);
      setSessionReady(true);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setIsAdmin(false);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;

    setProfileLoading(true);
    setProfileError(null);
    api
      .getMyProfile()
      .then((nextProfile) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setIsAdmin(!!nextProfile.is_admin);
      })
      .catch((err) => {
        if (cancelled) return;
        setProfile(null);
        setIsAdmin(false);
        setProfileError(
          err.message?.includes("404")
            ? "Signed in, but your BidSight profile is missing. Run the auth profile bootstrap migration and try again."
            : err.message
        );
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const loading = !sessionReady || (!!session && profileLoading);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        profile,
        isAdmin,
        profileLoading,
        profileError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
