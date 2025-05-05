// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// Client-side only: uses public anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment"
  );
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side only: service role key
// Guard so it doesn't bundle into client-side code
export const supabaseAdmin =
  typeof window === "undefined"
    ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    : undefined;
