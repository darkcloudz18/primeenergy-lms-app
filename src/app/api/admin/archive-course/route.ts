// src/app/api/admin/archive-course/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const { courseId } = await request.json();
  const { error } = await supabaseAdmin
    .from("courses")
    .update({ archived: true })
    .eq("id", courseId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
