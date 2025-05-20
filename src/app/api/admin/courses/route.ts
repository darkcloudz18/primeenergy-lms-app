// src/app/api/admin/courses/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { title } = await req.json();
  const { data, error } = await supabaseAdmin!
    .from("courses")
    .insert({ title })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ course: data });
}
