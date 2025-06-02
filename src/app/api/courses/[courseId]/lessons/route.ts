// src/app/api/courses/[courseId]/lessons/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Lesson } from "@/lib/types";

// In App Router, the handler signature must be (req: NextRequest, context: { params: { ... } })
export async function GET(
  _req: NextRequest,
  context: { params: { courseId: string } }
) {
  const courseId = context.params.courseId;

  // 1) Fetch all modules (including nested lessons) for this course
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

  // 2) Flatten out every lesson into a single array
  let allLessons: Lesson[] = [];
  modulesRaw.forEach((mod) => {
    if (Array.isArray(mod.lessons)) {
      allLessons = allLessons.concat(mod.lessons as Lesson[]);
    }
  });

  return NextResponse.json({ lessons: allLessons });
}
