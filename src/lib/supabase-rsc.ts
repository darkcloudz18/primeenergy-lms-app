// src/lib/supabase-rsc.ts
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/lib/types/supabase";

export function getSupabaseRSC() {
  return createServerComponentClient({ cookies }); // <Database>
}
