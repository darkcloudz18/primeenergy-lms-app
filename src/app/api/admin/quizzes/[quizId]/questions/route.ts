// app/api/admin/quizzes/[quizId]/questions/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  req: Request,
  { params }: { params: { quizId: string } }
) {
  const { quizId } = params;
  const payload = await req.json();
  // payload: { type, prompt_html, ordering }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("questions")
    .insert({ ...payload, quiz_id: quizId })
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
