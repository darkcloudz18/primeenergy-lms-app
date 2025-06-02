// src/app/api/courses/[courseId]/lessons/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Lesson } from "@/lib/types";

export async function GET(
  /** Must be NextRequest (not the raw Request) */
  _request: NextRequest,
  /** Explicitly type context.params so it's not “any” */
  context: { params: { courseId: string } }
) {
  const { courseId } = context.params;

  // 1) Fetch all modules for this course, including their nested lessons in one call:
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

  // 2) Flatten out every lesson from all modules:
  const allLessons: Lesson[] = [];
  modulesRaw.forEach((mod) => {
    if (Array.isArray(mod.lessons)) {
      // Each “lesson” here already has module_id + all Lesson fields
      allLessons.push(...(mod.lessons as Lesson[]));
    }
  });

  return NextResponse.json({ lessons: allLessons });
}
