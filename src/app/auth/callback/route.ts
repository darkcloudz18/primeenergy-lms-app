// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  // we’re not doing anything with the auth parameters here —
  // the Supabase client in the browser already persisted the session for us.
  return NextResponse.redirect("/");
}
