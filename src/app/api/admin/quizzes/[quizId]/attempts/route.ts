import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  // 1) Extract `quizId` from the URL path.
  //    If your route is: /api/admin/quizzes/[quizId]/attempts
  //    then `quizId` will be the 4th segment (0-based) of the pathname.
  //
  //    e.g.  incoming URL = "https://.../api/admin/quizzes/abc123/attempts"
  //          pathname.split("/") = ["", "api", "admin", "quizzes", "abc123", "attempts"]
  //                                                              ^------^ index 4
  const { pathname } = new URL(request.url);
  const segments = pathname.split("/");
  const quizId = segments[4];

  // 2) Create your Supabase server‐side client
  const supabase = createServerClient();

  // 3) (Optional) Grab a “dummy” user ID out of your profiles table, if you need one:
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

  // 4) Insert the new quiz_attempt row
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

  // 5) Return the new attempt’s ID
  return NextResponse.json({ id: attempt.id }, { status: 201 });
}
