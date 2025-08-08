// src/app/api/whoami/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();
  return NextResponse.json({ user: data.user });
}
