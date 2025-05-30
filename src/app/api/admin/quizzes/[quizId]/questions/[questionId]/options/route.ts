// src/app/api/admin/quizzes/[quizId]/questions/[questionId]/options/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  { params }: { params: { quizId: string; questionId: string } }
) {
  const { questionId } = params;
  const payload = await request.json();
  // payload: { text: string, is_correct: boolean, ordering: number }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("options")
    .insert({ ...payload, question_id: questionId })
    .select() // return the new row
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
