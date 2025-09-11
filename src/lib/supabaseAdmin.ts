// src/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

// Runtime guard so this never runs in the browser
if (typeof window !== "undefined") {
  throw new Error("supabaseAdmin must only be imported/used on the server.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  // Avoid Next.js caching for server-side calls
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, {
        ...init,
        cache: "no-store",
        next: { revalidate: 0 },
      }),
  },
});
