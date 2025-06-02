// src/app/api/courses/[courseId]/lessons/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Lesson } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { courseId: string } } // This line is correct now.
) {
  const { courseId } = params; // Access courseId directly from params.

  // 1) Fetch all modules (with nested lessons) for the given courseId:
  const { data: modulesRaw, error: modulesError } = await supabaseAdmin
    .from("modules")
    .select(
      `
      id,
      title,
      ordering,
      lessons (
        id,
        module_id,
        title,
        content,
        type,
        ordering,
        image_url,
        created_at
      )
    `
    )
    .eq("course_id", courseId)
    .order("ordering", { ascending: true })
    .order("lessons.ordering", { ascending: true });

  if (modulesError) {
    return NextResponse.json({ error: modulesError.message }, { status: 500 });
  }

  // 2) Flatten out all lessons from every module:
  const allLessons: Lesson[] = [];
  modulesRaw.forEach((mod) => {
    if (Array.isArray(mod.lessons)) {
      allLessons.push(...(mod.lessons as Lesson[]));
    }
  });

  return NextResponse.json({ lessons: allLessons });
}
