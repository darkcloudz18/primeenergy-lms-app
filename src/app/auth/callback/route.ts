// src/app/auth/callback/route.ts
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // … your existing logic (e.g. exchanging a code with your provider) …

  // Instead of `NextResponse.redirect('/')`, do:
  const baseUrl = new URL(request.url).origin;
  return NextResponse.redirect(new URL("/", baseUrl));
}
