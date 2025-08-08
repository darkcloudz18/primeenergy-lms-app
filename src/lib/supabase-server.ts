// src/lib/supabase-server.ts
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
// (optional) import your generated Database type:
// import type { Database } from "@/lib/database.types";

export function createServerClient() {
  // return createRouteHandlerClient<Database>({ cookies });
  return createRouteHandlerClient({ cookies }); // works without the typed DB too
}
