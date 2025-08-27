import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SaveQuizBody = {
  id?: string;
  course_id: string;
  module_id?: string | null; // null/undefined => final quiz
  title: string;
  description?: string | null;
  passing_score?: number | null;
};

type SaveQuizOk = { id: string };
type SaveQuizErr = { error: string };

export async function POST(req: Request) {
  let body: SaveQuizBody;
  try {
    body = (await req.json()) as SaveQuizBody;
  } catch {
    return NextResponse.json<SaveQuizErr>(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const {
    id,
    course_id,
    module_id = null,
    title,
    description = null,
    passing_score = null,
  } = body;

  if (!course_id || !title) {
    return NextResponse.json<SaveQuizErr>(
      { error: "Missing required fields (course_id, title)" },
      { status: 400 }
    );
  }

  if (id) {
    // Update existing quiz
    const { error } = await supabaseAdmin
      .from("quizzes")
      .update({
        title,
        description,
        passing_score,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json<SaveQuizErr>(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<SaveQuizOk>({ id });
  }

  // Create new quiz (module or final depending on module_id)
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .insert({
      course_id,
      module_id, // null => final quiz
      title,
      description,
      passing_score,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json<SaveQuizErr>(
      { error: error?.message ?? "Insert failed" },
      { status: 500 }
    );
  }

  return NextResponse.json<SaveQuizOk>({ id: data.id });
}
