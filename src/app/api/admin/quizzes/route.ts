// src/app/api/admin/quizzes/route.ts
import { NextResponse } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase-rsc";

// GET /api/admin/quizzes  → list all quizzes
export async function GET() {
  const supabase = getSupabaseRSC();
  const { data, error } = await supabase.from("quizzes").select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST /api/admin/quizzes → create a new quiz
export async function POST(request: Request) {
  const payload = await request.json();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("quizzes")
    .insert(payload)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
