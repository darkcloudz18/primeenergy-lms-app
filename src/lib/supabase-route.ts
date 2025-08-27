// src/lib/supabase-route.ts
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/lib/types/supabase";

export function getSupabaseRoute() {
  return createRouteHandlerClient({ cookies }); // <Database>
}
