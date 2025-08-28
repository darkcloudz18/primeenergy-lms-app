// src/lib/supabase-server.ts
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
// import type { Database } from "@/lib/types/supabase";

export function createServerClient() {
  return createServerComponentClient({ cookies }); // <Database>
}
