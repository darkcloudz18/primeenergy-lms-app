// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const PUBLIC = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/reset",
  "/auth/signout", // ← keep public
  "/courses",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow all public paths straight through.
  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Simple auth check: do we still have *any* Supabase cookie?
  const hasAuth =
    req.cookies.has("sb-access-token") ||
    req.cookies.has("sb-refresh-token") ||
    req.cookies.has("supabase-auth-token") ||
    req.cookies.has("supabase-auth-token.0");

  if (!hasAuth) {
    const url = new URL("/auth/login", req.url);
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
