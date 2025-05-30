// src/app/api/admin/quizzes/[quizId]/questions/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  const { quizId } = params;
  const payload = await request.json();
  // payload should include:
  // { type: 'multiple_choice'|'true_false'|'short_answer',
  //   prompt_html: string,
  //   ordering: number }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("questions")
    .insert({ ...payload, quiz_id: quizId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
