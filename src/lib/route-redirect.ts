// src/lib/route-redirect.ts
import { NextResponse } from "next/server";

function safePath(p?: string | null): string | null {
  if (!p || typeof p !== "string") return null;
  // Only allow same-site absolute paths like "/dashboard/..."
  if (p.startsWith("/")) return p;
  return null;
}

/**
 * Build a redirect response to either `redirect_to` (if safe) or `fallbackPath`.
 */
export function redirectFromRoute(
  req: Request,
  redirect_to: string | null | undefined,
  fallbackPath: string
) {
  const target = safePath(redirect_to) ?? fallbackPath;
  const url = new URL(target, req.url); // base on current host
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
