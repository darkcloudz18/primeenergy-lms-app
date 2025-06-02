// src/app/api/admin/quizzes/[quizId]/questions/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  // 1) Pull quizId out of the URL path
  const { pathname } = new URL(request.url);
  // e.g. "/api/admin/quizzes/abc123/questions"
  const parts = pathname.split("/");
  // ["", "api", "admin", "quizzes", "abc123", "questions"]
  const quizId = parts[4]; // index 4 is the dynamic segment

  // 2) Parse the incoming JSON
  let payload: {
    type: "multiple_choice" | "true_false" | "short_answer";
    prompt_html: string;
    ordering: number;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 3) Insert into "questions"
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("questions")
    .insert({ ...payload, quiz_id: quizId })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Insert failed" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
