// src/app/api/quizzes/[quizId]/attempts/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  context: {
    params: { quizId: string };
    searchParams: Record<string, string | string[]>;
  }
) {
  const { quizId } = context.params;
  const supabase = createServerClient();

  // 1) fetch a dummy user
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  if (profErr || !profiles?.length) {
    return NextResponse.json(
      { error: "No user_profiles found to use as dummy user_id" },
      { status: 500 }
    );
  }
  const dummyUserId = profiles[0].id;

  // 2) insert a new quiz_attempt
  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: dummyUserId,
      started_at: new Date().toISOString(),
    })
    .select() // return the newly inserted row
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  // 3) return the new attempt’s ID
  return NextResponse.json({ id: attempt.id }, { status: 201 });
}
