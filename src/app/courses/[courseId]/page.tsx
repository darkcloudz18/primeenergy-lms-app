// src/app/courses/[courseId]/page.tsx
import type { Lesson } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ClientCoursePage from "./components/ClientCoursePage";

interface PageProps {
  params: { courseId: string };
}

export default async function CoursePage({ params }: PageProps) {
  const { courseId } = params;

  // ▶️ Course metadata + extra fields
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("id, title, description, image_url, category, level, tag")
    .eq("id", courseId)
    .single();
  if (courseError || !course) throw new Error("Course not found");

  // ▶️ Lessons list
  const { data: lessonsRaw, error: lessonsError } = await supabaseAdmin
    .from("lessons")
    .select("id, title")
    .eq("course_id", courseId)
    .order("ordering", { ascending: true });
  if (lessonsError) throw new Error(lessonsError.message);
  const lessons = lessonsRaw as Lesson[];

  // ▶️ Enrollment count
  const { count: enrolledCount } = await supabaseAdmin
    .from("enrollments")
    .select("*", { head: true, count: "exact" })
    .eq("course_id", courseId);

  return (
    <ClientCoursePage
      courseId={course.id}
      title={course.title}
      description={course.description ?? undefined}
      imageUrl={course.image_url ?? undefined}
      category={course.category ?? undefined}
      level={course.level ?? undefined}
      tag={course.tag ?? undefined}
      enrolledCount={enrolledCount ?? 0}
      lessons={lessons}
    />
  );
}
