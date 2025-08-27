// src/app/api/admin/quizzes/[quizId]/route.ts
import { NextResponse } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase-rsc";

export async function GET(request: Request) {
  // 1) Extract quizId from the URL path
  const url = new URL(request.url);
  // e.g. "/api/admin/quizzes/abc123"
  const segments = url.pathname.split("/");
  // ["", "api", "admin", "quizzes", "abc123"]
  const quizId = segments[4]; // index 4 is [quizId]

  // 2) Fetch that quiz
  const supabase = getSupabaseRSC();
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Quiz not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(data);
}
