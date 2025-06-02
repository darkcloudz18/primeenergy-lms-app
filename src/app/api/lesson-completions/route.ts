// src/app/api/lesson-completions/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
// import type { Lesson } from "@/lib/types";    <–– remove this if you never use it

export async function GET(request: Request) {
  const supabase = createServerClient();
  const userId = request.headers.get("x-user-id") ?? "";
  // if you do want the rows, then use `data`. Otherwise drop it.

  const { data: completions, error } = await supabase
    .from("lesson_completions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ completions });
}

export async function POST(request: Request) {
  const supabase = createServerClient();
  const { lesson_id, user_id } = (await request.json()) as {
    lesson_id: string;
    user_id: string;
  };

  const { error } = await supabase.from("lesson_completions").insert([
    {
      lesson_id,
      user_id,
      completed_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
