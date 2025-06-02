// src/app/api/admin/quizzes/[quizId]/questions/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  // 1) Extract “quizId” from the URL path:
  const { pathname } = new URL(request.url);
  // e.g. "/api/admin/quizzes/abc123/questions"
  const parts = pathname.split("/");
  // parts = ["", "api", "admin", "quizzes", "abc123", "questions"]
  const quizId = parts[4]; // "abc123"

  const supabase = createServerClient();

  // 2) Parse the JSON body (expecting { title, description, ordering? } or similar):
  let body: { title: string; description?: string; ordering?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  // 3) Insert a new “quiz_questions” row for this quizId:
  const { data: newQuestion, error: insertErr } = await supabase
    .from("quiz_questions")
    .insert({
      quiz_id: quizId,
      prompt_html: body.title, // or however you name your columns
      question_type: body.description ?? "multiple_choice",
      ordering: body.ordering ?? 1,
    })
    .select()
    .single();

  if (insertErr || !newQuestion) {
    return NextResponse.json(
      { error: insertErr?.message || "Failed to insert question" },
      { status: 500 }
    );
  }

  return NextResponse.json(newQuestion, { status: 201 });
}
