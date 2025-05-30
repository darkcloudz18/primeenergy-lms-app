// src/app/api/admin/quizzes/[quizId]/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  const { quizId } = params;
  const supabase = createServerClient();

  // Fetch one quiz by ID
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  const { quizId } = params;
  const updates = await request.json();
  const supabase = createServerClient();

  // Update that quiz
  const { data, error } = await supabase
    .from("quizzes")
    .update(updates)
    .eq("id", quizId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: { quizId: string } }
) {
  const { quizId } = params;
  const supabase = createServerClient();

  // Delete the quiz
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
