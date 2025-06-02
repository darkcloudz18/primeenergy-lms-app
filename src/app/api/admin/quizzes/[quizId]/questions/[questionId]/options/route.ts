// src/app/api/admin/quizzes/[quizId]/questions/[questionId]/options/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  // 1) Grab the raw pathname from the incoming URL:
  const { pathname } = new URL(request.url);
  //    e.g. pathname = "/api/admin/quizzes/abc123/questions/xyz789/options"
  const segments = pathname.split("/");
  //    ["", "api", "admin", "quizzes", "abc123", "questions", "xyz789", "options"]
  const quizId = segments[4]; // “abc123”
  const questionId = segments[6]; // “xyz789”

  const supabase = createServerClient();

  // 2) Read the request body, if you expect JSON (optional):
  //    const body = await request.json();
  //    (e.g. if you’re inserting a new “quiz_option” with some fields)

  // 3) For example, insert a new option under (quizId, questionId):
  const { data: newOption, error: insertErr } = await supabase
    .from("quiz_options")
    .insert({
      quiz_id: quizId,
      question_id: questionId,
      text: (await request.json()).text, // or however you structure your payload
      is_correct: (await request.json()).is_correct,
      ordering: (await request.json()).ordering || 1,
    })
    .select()
    .single();

  if (insertErr || !newOption) {
    return NextResponse.json({ error: insertErr?.message }, { status: 500 });
  }

  return NextResponse.json(newOption, { status: 201 });
}
