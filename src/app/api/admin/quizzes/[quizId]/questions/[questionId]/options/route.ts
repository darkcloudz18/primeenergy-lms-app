// src/app/api/admin/quizzes/[quizId]/questions/[questionId]/options/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  context: { params: { quizId: string; questionId: string } }
) {
  // Extract questionId from context.params (we never actually use quizId here)
  const { questionId } = context.params;

  // Create a Supabase server client
  const supabase = createServerClient();

  // Attempt to parse JSON payload
  let body: { text: string; is_correct: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, is_correct } = body;
  if (typeof text !== "string" || typeof is_correct !== "boolean") {
    return NextResponse.json(
      { error: "`text` must be a string and `is_correct` a boolean." },
      { status: 400 }
    );
  }

  // Insert into your `quiz_options` table
  const { data, error } = await supabase
    .from("quiz_options")
    .insert({
      question_id: questionId,
      text,
      is_correct,
    })
    .select() // return the full row
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
