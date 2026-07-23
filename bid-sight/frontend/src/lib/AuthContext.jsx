import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    setProfileLoading(true);
    api
      .getMyProfile()
      .then((profile) => setIsAdmin(!!profile.is_admin))
      .catch(() => setIsAdmin(false))
      .finally(() => setProfileLoading(false));
  }, [userId]);

  return (
    <AuthContext.Provider
      value={{ session, loading: session === undefined, isAdmin, profileLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
