// app/api/quizzes/[quizId]/attempts/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  req: Request,
  { params }: { params: { quizId: string } }
) {
  const { quizId } = params;
  const supabase = createServerClient();
  // Supabase Edge Auth populates session; user_id can be grabbed via supabase.auth.getUser()
  // TODO: fetch user_id from auth context
  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({ quiz_id: quizId })
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(attempt, { status: 201 });
}
