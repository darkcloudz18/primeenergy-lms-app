import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server"; // your server client that reads/writes cookies

export async function POST() {
  const supabase = createServerClient();

  // Clear session on the server (cookies) and revoke refresh token
  await supabase.auth.signOut({ scope: "global" });

  // Never cache this response
  const res = NextResponse.redirect(
    new URL(
      "/auth/login",
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    )
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}
