// app/auth/signout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/** Delete a cookie name in different domain "shapes". */
function clearCookieVariants(
  res: NextResponse,
  name: string,
  req: NextRequest
) {
  const host = req.nextUrl.hostname; // e.g. app.example.com
  const apex = host.split(".").slice(-2).join("."); // example.com (best effort)
  const explicit = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

  const domains = Array.from(
    new Set<string | undefined>([
      undefined, // host-only
      host, // exact host
      apex, // apex
      explicit, // .env override if you set one
    ])
  );

  // Delete with Max-Age=0 + an old Expires, path=/, and both secure flags as needed.
  for (const domain of domains) {
    res.cookies.set({
      name,
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      ...(domain ? { domain } : {}),
      maxAge: 0,
      expires: new Date(0),
    });
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // 1) Revoke tokens and let the helper clear its own cookies.
  await supabase.auth.signOut({ scope: "global" });

  // 2) Also explicitly clear every Supabase cookie variant we can see.
  //    (If any are set with a different domain, we clear those variants too.)
  const res = NextResponse.redirect(new URL("/auth/login", req.url), {
    status: 302,
  });

  const incoming = req.cookies.getAll().map((c) => c.name);
  // Typical names across helpers/versions:
  const likely = new Set([
    "sb-access-token",
    "sb-refresh-token",
    "supabase-auth-token",
    "supabase-auth-token.0",
    "supabase-auth-token.1",
  ]);

  // Add anything that *looks* like a Supabase cookie.
  for (const n of incoming) {
    if (n.startsWith("sb-") || n.startsWith("supabase-")) {
      likely.add(n);
    }
  }

  for (const name of likely) {
    clearCookieVariants(res, name, req);
  }

  // Extra safety: prevent any caches from serving a stale authed page.
  res.headers.set("Cache-Control", "no-store");
  return res;
}

// Optional GET for manual testing in the browser:
export async function GET(req: NextRequest) {
  return POST(req);
}
