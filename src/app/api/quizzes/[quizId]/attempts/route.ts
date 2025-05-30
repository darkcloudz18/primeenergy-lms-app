// src/app/api/quizzes/[quizId]/attempts/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  // 1️⃣ Await params so we can read quizId
  const { quizId } = await params;

  // 2️⃣ Create your Supabase server client
  const supabase = createServerClient();

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

  // 4️⃣ Insert the new attempt, returning the row
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

  // 5️⃣ Return the attempt ID
  return NextResponse.json({ id: attempt.id }, { status: 201 });
}
