// src/app/api/lessons/route.ts

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  // ...fetch lessons from Supabase...
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .select("id, title, content, type, ordering, image_url, created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lessons: data });
}
