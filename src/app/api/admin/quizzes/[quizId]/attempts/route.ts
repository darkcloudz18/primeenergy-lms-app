// src/app/api/quizzes/[quizId]/attempts/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  // 1️⃣ Get the quizId from the URL
  const { quizId } = params;

  // 2️⃣ Create a Supabase client with your service role
  const supabase = createServerClient();

  // 3️⃣ Fetch the current user (logged in student) from the auth context
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 4️⃣ Insert a new row in `quiz_attempts`
  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: user.id,
      started_at: new Date().toISOString(),
    })
    .select() // ask Supabase to return the new row
    .single(); // get it as an object, not an array

  if (error || !attempt) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  // 5️⃣ Return just the new attempt's ID
  return NextResponse.json({ id: attempt.id }, { status: 201 });
}
