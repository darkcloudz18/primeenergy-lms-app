// src/app/api/admin/quizzes/[quizId]/attempts/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  // Now `quizId` is ready immediately—no `await params` needed:
  const { quizId } = params;

  // 1️⃣ Create Supabase server client
  const supabase = createServerClient();

  // 2️⃣ (Example) pick a “dummy” user_id from your profiles table:
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

  // 3️⃣ Insert a new quiz_attempt row
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

  // 4️⃣ Return just the new attempt’s ID
  return NextResponse.json({ id: attempt.id }, { status: 201 });
}
