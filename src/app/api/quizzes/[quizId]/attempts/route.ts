// src/app/api/quizzes/[quizId]/attempts/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// The handler context always includes both `params` and `searchParams`.
type HandlerContext = {
  params: { quizId: string };
  searchParams: Record<string, string | string[]>;
};

export async function POST(
  request: Request,
  { params, searchParams }: HandlerContext
) {
  // You can ignore `searchParams` if you don’t need it:
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _unusedSearch = searchParams;

  // Extract quizId from the parameters
  const { quizId } = params;

  // Create a Supabase server client (adjust your import if needed)
  const supabase = createServerClient();

  // Fetch a “dummy” user ID (for demo purposes)
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

  // Insert a new quiz_attempt row
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

  // Return the new attempt’s ID
  return NextResponse.json({ id: attempt.id }, { status: 201 });
}
