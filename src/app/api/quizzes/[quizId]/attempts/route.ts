// src/app/api/quizzes/[quizId]/attempts/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  // Now `params.quizId` is already available synchronously:
  const { quizId } = params;

  const supabase = createServerClient();

  // (1) Grab a “dummy” profile just so we can insert a fake user_id
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

  // (2) Insert a new quiz_attempt row
  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: dummyUserId,
      started_at: new Date().toISOString(),
    })
    .select() // ask Supabase to return the inserted row
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  // (3) Return the new attempt’s ID
  return NextResponse.json({ id: attempt.id }, { status: 201 });
}
