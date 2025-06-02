// src/app/api/admin/quizzes/[quizId]/attempts/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  // ✅ TS/Next now knows “there may be more fields” in that second argument,
  //    but we only care about params.quizId.
  const { quizId } = params;

  const supabase = createServerClient();

  // (optional) fetch a dummy user ID
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

  // Insert new attempt
  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: dummyUserId,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  return NextResponse.json({ id: attempt.id }, { status: 201 });
}
