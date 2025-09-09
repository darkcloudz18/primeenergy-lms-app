// src/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  // IMPORTANT: avoid Next.js fetch cache for server-side queries
  global: {
    fetch: (url, options) =>
      fetch(url, {
        ...options,
        cache: "no-store",
        // also disable any ISR for these calls
        next: { revalidate: 0 },
      }),
  },
});
