// src/app/courses/[courseId]/page.tsx
import type { Course, Lesson } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import CourseLessonPage from "@/components/CourseLessonPage";

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: PageProps) {
  // 1) Wait for the params promise to resolve:
  const { courseId } = await params;

  // 2) Fetch the course
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    // you might want to redirect to a 404 here instead
    throw new Error("Course not found");
  }

  // 3) Fetch its lessons, ordered by your `ordering` column
  const { data: lessonsRaw, error: lessonsError } = await supabaseAdmin
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });

  if (lessonsError) {
    throw new Error(lessonsError.message);
  }

  const lessons = (lessonsRaw ?? []) as Lesson[];

  // 4) Delegate to your client component
  return (
    <CourseLessonPage course={course as Course} initialLessons={lessons} />
  );
}
