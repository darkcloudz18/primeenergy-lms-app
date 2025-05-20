// src/app/api/profiles/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { id, email, role } = await req.json();
  const { error } = await supabaseAdmin
    .from("profiles")
    .insert({ id, email, role });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
