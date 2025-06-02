// src/app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(req: Request) {
  // 1) Parse the URL to pull out the [id] segment
  const url = new URL(req.url);
  // url.pathname might be "/api/admin/users/abc123"
  const segments = url.pathname.split("/");
  // ["", "api", "admin", "users", "abc123"]
  const id = segments[4];

  // 2) Read the new role from the request body
  const { role } = await req.json();

  // 3) Update the user in Supabase
  const { data, error } = await supabaseAdmin!
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ user: data });
}
