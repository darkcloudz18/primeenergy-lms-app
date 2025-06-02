// src/app/api/courses/[courseId]/lessons/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Lesson } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: { courseId: string } }
) {
  const courseId = params.courseId;

  // 1) Fetch all modules for this course, including each nested lesson’s module_id
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

  // 2) Now that each lesson row actually has a module_id field, it matches `Lesson`
  let allLessons: Lesson[] = [];
  modulesRaw.forEach((m: { lessons?: Lesson[] }) => {
    if (Array.isArray(m.lessons)) {
      allLessons = allLessons.concat(m.lessons);
    }
  });

  return NextResponse.json({ lessons: allLessons });
}
