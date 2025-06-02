// src/app/api/admin/quizzes/[quizId]/questions/[questionId]/options/route.ts
import { NextResponse, NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: { quizId: string; questionId: string } }
) {
  // Only extract questionId, since quizId isn’t used:
  const { questionId } = params;

  // Create Supabase server client (no args)
  const supabase = createServerClient();

  // Parse incoming JSON payload
  let body: { text: string; is_correct: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, is_correct } = body;
  if (typeof text !== "string" || typeof is_correct !== "boolean") {
    return NextResponse.json(
      { error: "`text` must be a string and `is_correct` must be a boolean." },
      { status: 400 }
    );
  }

  // Insert a new option tied to this question
  const { data, error } = await supabase
    .from("quiz_options")
    .insert({
      question_id: questionId,
      text,
      is_correct,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
