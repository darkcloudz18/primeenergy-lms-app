// src/app/api/admin/quizzes/[quizId]/attempts/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  context: { params: { quizId: string } }
) {
  // ① Pull quizId directly out of context.params (no Promise wrapper)
  const { quizId } = context.params;

  // ② Create your Supabase server client
  const supabase = createServerClient();

  // ③ (Optional) if you need a dummy user ID, fetch one from profiles
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  if (profErr || !profiles || profiles.length === 0) {
    return NextResponse.json(
      { error: "No user_profiles found to use as dummy user_id" },
      { status: 500 }
    );
  }
  const dummyUserId = profiles[0].id;

  // ④ Insert a new quiz_attempt row and return it
  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: dummyUserId,
      started_at: new Date().toISOString(),
    })
    .select() // ask Supabase to return the new row
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  return NextResponse.json({ id: attempt.id }, { status: 201 });
}
