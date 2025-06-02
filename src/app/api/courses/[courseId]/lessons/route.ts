// src/app/api/courses/[courseId]/lessons/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Lesson } from "@/lib/types";

// Notice: we explicitly type “context” as { params: { courseId: string } }.
export async function GET(
  _request: NextRequest,
  context: { params: { courseId: string } }
) {
  const { courseId } = context.params;

  // 1) Fetch modules (with nested lessons) in one query
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
      allLessons.push(...(mod.lessons as Lesson[]));
    }
  });

  return NextResponse.json({ lessons: allLessons });
}
