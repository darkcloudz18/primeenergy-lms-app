// src/lib/supabase-server.ts
import { supabaseAdmin } from "./supabaseAdmin";

/**
 * A wrapper you can call in any server context
 * to get your service-role Supabase client.
 */
export function createServerClient() {
  return supabaseAdmin;
}
