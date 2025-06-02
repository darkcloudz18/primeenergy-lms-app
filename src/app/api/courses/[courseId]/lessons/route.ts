// src/app/api/courses/[courseId]/lessons/route.ts

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import type { Lesson } from "@/lib/types";

// NOTE: We assume your `src/lib/types.ts` exports:
//    export type Lesson = {
//      id: string;
//      title: string;
//      content: string;
//      type: "article" | "video" | "image";
//      ordering: number;
//      image_url: string | null;
//      created_at: string;
//    };

export async function GET(
  _req: Request,
  { params }: { params: { courseId: string } }
) {
  const courseId = params.courseId;

  // 1) Fetch all modules for this course, *including* their nested lessons in one call:
  const { data: modulesRaw, error: modulesError } = await supabaseAdmin
    .from("modules")
    .select(
      `
      id,
      title,
      ordering,
      lessons (
        id,
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

  // 2) Flatten out all the lessons from every module:
  let allLessons: Lesson[] = [];
  // modulesRaw has type: Array<{ id: string; title: string; ordering: number; lessons: Lesson[] }>
  modulesRaw.forEach((m: { lessons?: Lesson[] }) => {
    if (m.lessons && Array.isArray(m.lessons)) {
      allLessons = allLessons.concat(m.lessons);
    }
  });

  return NextResponse.json({ lessons: allLessons });
}
