// src/app/api/quizzes/[quizId]/attempts/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  // 1) Extract quizId from the URL
  const { quizId } = params;

  // 2) Create a Supabase server‐side client
  const supabase = createServerClient();

  // 3) (Optional) Grab a “dummy” profile so we can insert a fake user_id
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

  // 4) Insert a new quiz_attempt row, returning the inserted row
  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: dummyUserId,
      started_at: new Date().toISOString(),
    })
    .select() // ask Supabase to return the newly inserted row
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  // 5) Return the new attempt’s ID
  return NextResponse.json({ id: attempt.id }, { status: 201 });
}
