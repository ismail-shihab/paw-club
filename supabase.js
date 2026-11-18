import { createClient } from "@supabase/supabase-js";

// Only the public anon key goes in the frontend. NEVER put the service_role key here.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);