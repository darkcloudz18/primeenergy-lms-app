// src/app/api/courses/[courseId]/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Course, Lesson } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: { courseId: string } }
) {
  const { courseId } = params;

  // 1) Fetch the course row
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .select(
      "id, title, description, image_url, category, level, tag, created_at"
    )
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  const typedCourse = course as Course;

  // 2) Fetch all lessons for that course
  const { data: lessonsRaw, error: lessonError } = await supabaseAdmin
    .from("lessons")
    .select("id, title, content, type, ordering, image_url, created_at")
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });

  if (lessonError) {
    return NextResponse.json({ error: lessonError.message }, { status: 500 });
  }
  const lessons = (lessonsRaw as Lesson[]) || [];

  // 3) Return both course + lessons
  return NextResponse.json({
    course: typedCourse,
    lessons: lessons,
  });
}
