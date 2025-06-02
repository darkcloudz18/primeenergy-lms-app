// src/app/api/courses/[courseId]/lessons/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Lesson } from "@/lib/types";

// NOTE: We assume your `src/lib/types.ts` exports something like:
//   export type Lesson = {
//     id: string;
//     module_id: string;
//     title: string;
//     content: string;
//     type: "article" | "video" | "image";
//     ordering: number;
//     image_url: string | null;
//     created_at: string;
//   };

export async function GET(
  _req: NextRequest,
  context: { params: { courseId: string } }
) {
  const courseId = context.params.courseId;

  // 1) Fetch all modules for this course, including their nested lessons:
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

  // 2) Flatten out every lesson from all modules into a single array:
  const allLessons: Lesson[] = [];
  modulesRaw.forEach((mod) => {
    if (Array.isArray(mod.lessons)) {
      allLessons.push(...(mod.lessons as Lesson[]));
    }
  });

  return NextResponse.json({ lessons: allLessons });
}
