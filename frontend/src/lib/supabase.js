// Supabase client for AUTH ONLY. Uses the publishable (anon) key — safe in the
// browser. All game logic goes through the FastAPI backend, not this client.
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
